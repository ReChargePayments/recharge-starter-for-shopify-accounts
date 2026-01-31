import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useRescheduleCharge } from "../hooks/useRescheduleCharge";

const dateOnlyIso = (input: string | null | undefined) => {
  if (!input) return null;
  if (input.length >= 10) return input.slice(0, 10);
  return input;
};

export const ChargeRescheduleModal = ({
  chargeId,
  currentChargeDateIso,
  onRescheduled,
}: {
  chargeId: number | string;
  currentChargeDateIso: string | null;
  onRescheduled: (newDateIso: string) => void | Promise<void>;
}) => {
  const modalRef = useRef<any>(null);
  const [selectedIso, setSelectedIso] = useState<string>("");

  const { mutate: rescheduleCharge, isPending: isSaving, error } = useRescheduleCharge({
    onSuccess: async (data) => {
      const newIso = dateOnlyIso(selectedIso);
      shopify.toast.show("Order rescheduled");
      modalRef.current?.hideOverlay?.();
      if (newIso) {
        void Promise.resolve(onRescheduled(newIso)).catch((e) => {
          console.warn("Reschedule succeeded but refresh failed:", e);
        });
      }
    }
  });

  useEffect(() => {
    // Reset selection when opening context changes
    setSelectedIso(currentChargeDateIso ?? "");
  }, [currentChargeDateIso]);

  const viewMonth = useMemo(() => {
    const iso = dateOnlyIso(selectedIso) ?? dateOnlyIso(currentChargeDateIso) ?? null;
    return iso ? iso.slice(0, 7) : undefined;
  }, [selectedIso, currentChargeDateIso]);

  const handleSave = () => {
    const newIso = dateOnlyIso(selectedIso);
    if (!newIso) return;
    
    const curIso = dateOnlyIso(currentChargeDateIso);
    if (curIso && newIso === curIso) {
      modalRef.current?.hideOverlay?.();
      return;
    }

    if (isSaving) return;
    rescheduleCharge({ chargeId, newDateIso: newIso });
  };

  return (
    <s-modal id="reschedule-charge-modal" heading="Reschedule Order" ref={modalRef}>
      <s-stack gap="base">
        <s-text color="subdued">
          Choose a new date for this order.
        </s-text>

        {error ? (
          <s-banner tone="critical">
            <s-text>{error.message}</s-text>
          </s-banner>
        ) : null}

        <s-date-picker
          type="single"
          name="reschedule-date"
          disallow="past"
          value={selectedIso}
          view={viewMonth}
          onChange={(event) => setSelectedIso(event.currentTarget.value)}
        />
      </s-stack>

      <s-button slot="secondary-actions" commandFor="reschedule-charge-modal" command="--hide">
        Close
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        disabled={!dateOnlyIso(selectedIso) || isSaving}
        onClick={handleSave}
      >
        {isSaving ? "Saving..." : "Save"}
      </s-button>
    </s-modal>
  );
};
