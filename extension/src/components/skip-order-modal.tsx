import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ProductData } from "../components/types";
import { addIntervalIso } from "../utils/rechargeSdk";
import { useSkipItem } from "../hooks/useSkipItem";
import { useRescheduleSubscription } from "../hooks/useRescheduleSubscription";
import { formatDateDisplay } from "../utils/date";

function dateOnlyIso(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.length >= 10) return input.slice(0, 10);
  return input;
}

type ItemPreview = {
  product: ProductData;
  existingDateIso: string | null;
  newDateIso: string | null;
};

export const SkipOrderModal = ({
  upcomingProducts,
  upcomingDateIso,
  onSkipped,
}: {
  upcomingProducts: ProductData[];
  upcomingDateIso: string | null;
  onSkipped: () => void | Promise<void>;
}) => {
  const modalRef = useRef<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note: These hooks are used for individual operations, but we handle the batch logic manually
  const { mutate: skipItemMutation } = useSkipItem();
  const { mutate: rescheduleSubscription } = useRescheduleSubscription();

  const previews: ItemPreview[] = useMemo(() => {
    return (upcomingProducts ?? []).map((p) => {
      const existingDateIso = dateOnlyIso(p.nextChargeScheduledAt);
      // Calculate new date as existing scheduled date + subscription frequency
      const newDateIso =
        existingDateIso && p.orderIntervalFrequency && p.orderIntervalUnit
          ? addIntervalIso(existingDateIso, p.orderIntervalFrequency, p.orderIntervalUnit)
          : null;
      return { product: p, existingDateIso, newDateIso };
    });
  }, [upcomingProducts]);

  useEffect(() => {
    setError(null);
    setIsSaving(false);
  }, [upcomingDateIso, upcomingProducts]);

  const handleSkipOrder = async () => {
    if (isSaving) return;
    if (!upcomingDateIso || previews.length === 0) return;

    const missingDate = previews.filter((p) => !p.existingDateIso);
    if (missingDate.length > 0) {
      setError("Some items are missing a scheduled date and can't be skipped.");
      return;
    }

    const missingFrequency = previews.filter(
      (p) => !p.product.orderIntervalFrequency || !p.product.orderIntervalUnit
    );
    if (missingFrequency.length > 0) {
      setError("Some items are missing frequency information and can't be skipped.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const skipFailures: Array<{ title: string; message: string }> = [];
      const dateUpdateFailures: Array<{ title: string; message: string }> = [];

      // Step 1: Skip each item
      for (const item of previews) {
        const iso = item.existingDateIso!;
        try {
          await skipItemMutation({ subscriptionId: item.product.subscriptionId, date: iso });
        } catch (e) {
          skipFailures.push({
            title: item.product.title ?? "Item",
            message: e instanceof Error ? e.message : "Failed to skip",
          });
        }
      }

      if (skipFailures.length > 0) {
        setError(`Failed to skip ${skipFailures.length} item(s). Please try again.`);
        return;
      }

      // Step 2: Update each subscription's next charge date to skipped date + frequency
      for (const item of previews) {
        const newDateIso = item.newDateIso;
        if (!newDateIso) {
          dateUpdateFailures.push({
            title: item.product.title ?? "Item",
            message: "Could not calculate new charge date",
          });
          continue;
        }

        try {
          await rescheduleSubscription({
            subscriptionId: item.product.subscriptionId,
            newDateIso,
            options: { commit: true }
          });
        } catch (e) {
          // Log warning but don't fail the entire operation
          console.warn(
            `Failed to update charge date for subscription ${item.product.subscriptionId}:`,
            e
          );
          dateUpdateFailures.push({
            title: item.product.title ?? "Item",
            message: e instanceof Error ? e.message : "Failed to update charge date",
          });
        }
      }

      if (dateUpdateFailures.length > 0) {
        // Show warning but still consider the operation successful
        console.warn(
          `Order skipped but ${dateUpdateFailures.length} subscription(s) failed to update charge dates:`,
          dateUpdateFailures
        );
        shopify.toast.show(
          `Order skipped. ${dateUpdateFailures.length} item(s) may need manual date adjustment.`
        );
      } else {
        shopify.toast.show("Order skipped");
      }

      modalRef.current?.hideOverlay?.();
      void Promise.resolve(onSkipped()).catch((e) => {
        console.warn("Skip order succeeded but refresh failed:", e);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to skip order");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <s-modal id="skip-order-modal" heading="Skip Upcoming Order?" ref={modalRef}>
      <s-stack gap="base">
        <s-text color="subdued">
          These items will be removed from the upcoming order. They will instead ship on the next available order date
          based on the frequency you have selected.
        </s-text>

        {error ? (
          <s-banner tone="critical">
            <s-text>{error}</s-text>
          </s-banner>
        ) : null}

        <s-stack gap="small">
          {previews.length > 0 ? (
            previews.map(({ product, existingDateIso, newDateIso }) => (
              <s-box key={product.subscriptionId} padding="base" background="base" border="base" borderRadius="base">
                <s-stack direction="inline" alignItems="center" gap="base">
                  <s-box padding="none">
                    <s-product-thumbnail src={product.imageSrc ?? undefined} />
                  </s-box>

                  <s-stack gap="small">
                    {product.brand ? (
                      <s-text type="small" color="subdued">
                        {product.brand}
                      </s-text>
                    ) : null}

                    <s-text>{product.title}</s-text>

                    {product.subTitle ? (
                      <s-text type="small" color="subdued">
                        {product.subTitle}
                      </s-text>
                    ) : null}

                    <s-stack direction="inline" alignItems="center" gap="small">
                      <s-badge color="subdued" icon="calendar" size="small">
                        <s-text color="subdued" type="small">
                          {existingDateIso ? formatDateDisplay(existingDateIso, 'short') : "No scheduled date"}
                        </s-text>
                      </s-badge>
                      <s-text color="subdued" type="small">
                        →
                      </s-text>
                      <s-badge color="subdued" icon="calendar" size="small">
                        <s-text color="subdued" type="small">
                          {newDateIso ? formatDateDisplay(newDateIso, 'short') : "—"}
                        </s-text>
                      </s-badge>
                    </s-stack>
                  </s-stack>
                </s-stack>
              </s-box>
            ))
          ) : (
            <s-text color="subdued">No items in your upcoming order.</s-text>
          )}
        </s-stack>
      </s-stack>

      <s-button
        slot="primary-action"
        variant="primary"
        disabled={!upcomingDateIso || previews.length === 0 || isSaving}
        onClick={handleSkipOrder}
      >
        {isSaving ? "Skipping..." : "Skip Order"}
      </s-button>
    </s-modal>
  );
};


