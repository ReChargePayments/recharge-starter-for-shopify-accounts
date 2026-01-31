import {
  activateSubscription,
  cancelSubscription,
  listCharges,
  rescheduleCharge,
  skipCharge,
  skipSubscriptionCharge,
  updateSubscriptionChargeDate,
  updateSubscription,
  type BasicSubscriptionParams,
  type CancelSubscriptionRequest,
  type IntervalUnit,
  type Session,
} from "@rechargeapps/storefront-client";
import { formatDateToIso } from "./date";

// Module-level reference to getSession from context
// Set by RechargeSessionProvider on mount
let contextGetSession: (() => Promise<Session>) | null = null;

export function setRechargeSessionGetter(getSession: () => Promise<Session>) {
  contextGetSession = getSession;
}

async function getSessionOrThrow() {
  if (!contextGetSession) {
    throw new Error("RechargeSessionProvider not initialized");
  }
  return await contextGetSession();
}

export type SubscriptionUpdateOptions = BasicSubscriptionParams;

type IsoDate = `${number}-${string}-${string}` | string;

function dateOnlyIso(input: string | null | undefined): string | null {
  if (!input) return null;
  // Recharge returns either YYYY-MM-DD or an ISO timestamp. Normalize to YYYY-MM-DD.
  if (input.length >= 10) return input.slice(0, 10);
  return input;
}

function parseIsoDate(iso: string): Date {
  // Force local-midnight to avoid timezone shifting when formatting back to YYYY-MM-DD.
  return new Date(`${iso}T00:00:00`);
}

function daysInMonth(year: number, monthIndex0: number) {
  // monthIndex0: 0-11
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function addMonthsClamped(anchorIso: string, months: number): string {
  const anchor = parseIsoDate(anchorIso);
  const targetMonthIndex0 = anchor.getMonth() + months;
  const targetYear = anchor.getFullYear() + Math.floor(targetMonthIndex0 / 12);
  const normalizedMonthIndex0 = ((targetMonthIndex0 % 12) + 12) % 12;
  const desiredDay = anchor.getDate();
  const dim = daysInMonth(targetYear, normalizedMonthIndex0);
  const clampedDay = Math.min(desiredDay, dim);
  return formatDateToIso(new Date(targetYear, normalizedMonthIndex0, clampedDay));
}

function addWeeks(anchorIso: string, weeks: number): string {
  const d = parseIsoDate(anchorIso);
  d.setDate(d.getDate() + weeks * 7);
  return formatDateToIso(d);
}

function addInterval(anchorIso: string, frequency: number, unit: string): string {
  const freq = Number(frequency);
  if (!Number.isFinite(freq) || freq <= 0) return anchorIso;
  const u = (unit ?? "").toLowerCase();
  if (u.startsWith("month")) return addMonthsClamped(anchorIso, freq);
  if (u.startsWith("week")) return addWeeks(anchorIso, freq);
  // Fallback: treat unknown unit as weeks (safer than days in many cadence models)
  return addWeeks(anchorIso, freq);
}

/**
 * Public helper for UI: given a YYYY-MM-DD date and a subscription interval, compute the next date.
 * This is used for previewing the "new date" when skipping an item.
 */
export function addIntervalIso(
  anchorIso: string,
  frequency?: number | null,
  unit?: string | null
): string {
  const iso = dateOnlyIso(anchorIso) ?? anchorIso;
  const freq = Number(frequency);
  if (!Number.isFinite(freq) || freq <= 0) return iso;
  return addInterval(iso, freq, unit ?? "");
}

export async function changeQuantity(
  subscriptionId: number | string,
  newQuantity: number,
  options?: SubscriptionUpdateOptions
) {
  const session = await getSessionOrThrow();

  return await updateSubscription(
    session,
    subscriptionId,
    { quantity: newQuantity },
    options
  );
}

export async function changeFrequency(
  subscriptionId: number | string,
  input: {
    orderIntervalFrequency: number;
    orderIntervalUnit: IntervalUnit;
    /**
     * Recharge requires charge/order fields to be updated together. If you omit this,
     * we'll default it to orderIntervalFrequency (common for monthly subscriptions).
     */
    chargeIntervalFrequency?: number;
  },
  options?: SubscriptionUpdateOptions
) {
  const session = await getSessionOrThrow();
  const chargeIntervalFrequency =
    input.chargeIntervalFrequency ?? input.orderIntervalFrequency;

  // NOTE: SDK docs warn that updating these fields can regenerate charges / reset skips.
  return await updateSubscription(
    session,
    subscriptionId,
    {
      order_interval_frequency: input.orderIntervalFrequency as unknown as any,
      order_interval_unit: input.orderIntervalUnit,
      charge_interval_frequency: chargeIntervalFrequency as unknown as any,
    },
    options
  );
}

export async function skipItem(
  subscriptionId: number | string,
  date: string
) {
  const session = await getSessionOrThrow();

  // Prefer skipping an *existing* queued charge when it exists (Recharge "skipCharge" API).
  // Docs: https://storefront.rechargepayments.com/client/docs/methods/api/charge/#skipcharge
  const { charges } = await listCharges(session, {
    purchase_item_id: subscriptionId,
    scheduled_at: date as any,
    status: ["queued"],
    limit: 1,
    sort_by: "scheduled_at-asc",
  } as any);

  const existingCharge = charges?.[0];
  if (existingCharge) {
    return await skipCharge(session, existingCharge.id, [subscriptionId]);
  }

  // Fallback: skip by subscription + date (creates a skip even if no queued charge exists yet)
  return await skipSubscriptionCharge(session, subscriptionId, date as any);
}

export async function cancelItem(
  subscriptionId: number | string,
  input: {
    reason: CancelSubscriptionRequest["cancellation_reason"];
    comments?: CancelSubscriptionRequest["cancellation_reason_comments"];
    sendEmail?: CancelSubscriptionRequest["send_email"];
  },
  options?: SubscriptionUpdateOptions
) {
  const session = await getSessionOrThrow();
  return await cancelSubscription(
    session,
    subscriptionId,
    {
      cancellation_reason: input.reason,
      cancellation_reason_comments: input.comments,
      send_email: input.sendEmail,
    },
    options
  );
}

/**
 * Reactivate a cancelled subscription and set its next charge date so it lands on the next upcoming order.
 *
 * NOTE: You can't update subscription "status" via updateSubscription; use activateSubscription instead.
 */
export async function subscribeToNextUpcomingOrder(
  subscriptionId: number | string,
  nextChargeDateIso: string
) {
  const session = await getSessionOrThrow();
  await activateSubscription(session, subscriptionId, { commit: true });
  return await updateSubscriptionChargeDate(session, subscriptionId, nextChargeDateIso as any, {
    commit: true,
  });
}

/**
 * Move an ACTIVE subscription into the upcoming order by setting its next charge date to the upcoming date.
 * Recharge will merge charges for matching address + date.
 */
export async function addActiveSubscriptionToUpcomingOrder(
  subscriptionId: number | string,
  upcomingDateIso: string,
  options?: { commit?: boolean }
) {
  const session = await getSessionOrThrow();
  const commit = options?.commit ?? true;
  return await updateSubscriptionChargeDate(
    session,
    subscriptionId,
    upcomingDateIso as any,
    { commit } as any
  );
}

export async function swapSubscriptionVariant(
  subscriptionId: number | string,
  newExternalVariantId: string,
  options?: SubscriptionUpdateOptions
) {
  const session = await getSessionOrThrow();
  return await updateSubscription(
    session,
    subscriptionId,
    {
      external_variant_id: { ecommerce: newExternalVariantId },
    } as any,
    { commit: true, ...(options ?? {}) }
  );
}

type ActiveSubscriptionForRealign = {
  id: number | string;
  status?: string;
  address_id?: number | string;
  next_charge_scheduled_at?: string | null;
  order_interval_frequency?: number;
  order_interval_unit?: string;
};

/**
 * Change the upcoming order date and realign other future subscription dates so the customer
 * has one anchored day-of-month.
 *
 * Behavior:
 * - If a queued charge exists on currentUpcomingDateIso, reschedule it to newUpcomingDateIso.
 * - Update upcoming subscriptions' next charge date to newUpcomingDateIso.
 * - For all other active subscriptions, set next charge date to newUpcomingDateIso + (its interval).
 * - Month math is clamped for short months (e.g. 31st -> Feb 28/29).
 */
export async function changeUpcomingOrderDateAndRealign(input: {
  currentUpcomingDateIso: IsoDate;
  newUpcomingDateIso: IsoDate;
  subscriptions: ActiveSubscriptionForRealign[];
  options?: { commit?: boolean };
}) {
  const session = await getSessionOrThrow();
  const commit = input.options?.commit ?? true;
  const currentUpcomingDateIso = dateOnlyIso(String(input.currentUpcomingDateIso));
  const newUpcomingDateIso = dateOnlyIso(String(input.newUpcomingDateIso));
  if (!currentUpcomingDateIso) throw new Error("Missing currentUpcomingDateIso");
  if (!newUpcomingDateIso) throw new Error("Missing newUpcomingDateIso");

  const active = (input.subscriptions ?? []).filter(
    (s) => (s.status ?? "").toLowerCase() === "active"
  );

  // Single-address assumption, but still derive from data safely.
  const addressId =
    active.find((s) => s.address_id !== undefined && s.address_id !== null)
      ?.address_id ?? null;

  const upcomingSubs = active.filter(
    (s) => dateOnlyIso(s.next_charge_scheduled_at ?? undefined) === currentUpcomingDateIso
  );
  const futureSubs = active.filter(
    (s) =>
      Boolean(dateOnlyIso(s.next_charge_scheduled_at ?? undefined)) &&
      dateOnlyIso(s.next_charge_scheduled_at ?? undefined) !== currentUpcomingDateIso
  );

  // 1) Reschedule queued charge(s) for the upcoming order date when possible.
  if (addressId != null) {
    try {
      const { charges } = await listCharges(session, {
        address_id: addressId,
        scheduled_at: currentUpcomingDateIso as any,
        status: ["queued"],
        limit: 50,
        sort_by: "scheduled_at-asc",
      } as any);

      const toReschedule = (charges ?? []).filter(
        (c: any) => dateOnlyIso(c?.scheduled_at) === currentUpcomingDateIso
      );

      // If multiple queued charges match, reschedule all to keep system consistent.
      for (const ch of toReschedule) {
        await rescheduleCharge(session, ch.id, newUpcomingDateIso as any);
      }
    } catch (e) {
      // If rescheduleCharge is not allowed or fails, we still proceed to update subscriptions directly.
      console.warn("Failed to reschedule queued charge; falling back to subscription date updates:", e);
    }
  }

  // 2) Ensure upcoming subscriptions reflect the new upcoming date.
  for (const s of upcomingSubs) {
    await updateSubscriptionChargeDate(session, s.id, newUpcomingDateIso as any, {
      commit,
    } as any);
  }

  // 3) Realign other future subscriptions anchored to the new upcoming date.
  for (const s of futureSubs) {
    const freq = Number(s.order_interval_frequency ?? 1);
    const unit = String(s.order_interval_unit ?? "month");
    const target = addInterval(newUpcomingDateIso, freq, unit);
    await updateSubscriptionChargeDate(session, s.id, target as any, {
      commit,
    } as any);
  }

  return {
    rescheduledFrom: currentUpcomingDateIso,
    rescheduledTo: newUpcomingDateIso,
    updatedUpcomingSubscriptionIds: upcomingSubs.map((s) => s.id),
    realignedSubscriptionIds: futureSubs.map((s) => s.id),
  };
}

/**
 * Reschedule a charge to a new date
 */
export async function rescheduleChargeDate(
  chargeId: number | string,
  newDateIso: string
) {
  const session = await getSessionOrThrow();
  return await rescheduleCharge(session, chargeId, newDateIso as any);
}

/**
 * Skip a charge
 */
export async function skipChargeById(
  chargeId: number | string,
  subscriptionIds: (number | string)[]
) {
  const session = await getSessionOrThrow();
  return await skipCharge(session, chargeId, subscriptionIds);
}

/**
 * Reschedule a subscription's next charge date
 */
export async function rescheduleSubscription(
  subscriptionId: number | string,
  newDateIso: string,
  options?: { commit?: boolean }
) {
  const session = await getSessionOrThrow();
  return await updateSubscriptionChargeDate(
    session,
    subscriptionId,
    newDateIso as any,
    { commit: options?.commit ?? true } as any
  );
}
