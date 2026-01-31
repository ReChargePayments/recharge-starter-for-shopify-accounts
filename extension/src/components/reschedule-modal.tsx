import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { useRescheduleSubscription } from "../hooks/useRescheduleSubscription";

const dateOnlyIso = (input: string | null | undefined) => {
  if (!input) return null;
  if (input.length >= 10) return input.slice(0, 10);
  return input;
};

export const RescheduleModal = ({
  subscriptionId,
  currentChargeDateIso,
  onRescheduled,
  modalId = "reschedule-modal",
}: {
  subscriptionId: number | string;
  currentChargeDateIso: string | null;
  onRescheduled: () => void | Promise<void>;
  modalId?: string;
}) => {
  const modalRef = useRef<any>(null);
  const [selectedIso, setSelectedIso] = useState<string>("");

  const { mutate: rescheduleSubscription, isPending: isSaving, error } = useRescheduleSubscription({
    onSuccess: async () => {
      shopify.toast.show("Subscription rescheduled");
      modalRef.current?.hideOverlay?.();
      void Promise.resolve(onRescheduled()).catch((e) => {
        console.warn("Reschedule succeeded but refresh failed:", e);
      });
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
    rescheduleSubscription({
      subscriptionId,
      newDateIso: newIso,
      options: { commit: true }
    });
  };

  return (
    <s-modal id={modalId} heading="Reschedule subscription" ref={modalRef}>
      <s-stack gap="base">
        <s-text color="subdued">
          Choose a new date for this subscription's next charge.
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

      <s-button slot="secondary-actions" commandFor={modalId} command="--hide">
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
