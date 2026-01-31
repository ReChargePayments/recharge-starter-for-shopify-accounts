import { useEffect, useMemo, useRef } from "preact/hooks";
import { ProductData } from "../components/types";
import { addIntervalIso } from "../utils/rechargeSdk";
import { useSkipItem } from "../hooks/useSkipItem";
import { formatDateDisplay } from "../utils/date";

function dateOnlyIso(input: string | null | undefined): string | null {
  if (!input) return null;
  if (input.length >= 10) return input.slice(0, 10);
  return input;
}

export const SkipItemModal = ({
  productData,
  onSkipped,
}: {
  productData: ProductData | null;
  onSkipped: () => void | Promise<void>;
}) => {
  const modalRef = useRef<any>(null);

  const existingDateIso = useMemo(() => {
    return dateOnlyIso(productData?.nextChargeScheduledAt);
  }, [productData]);

  const newDateIso = useMemo(() => {
    if (!existingDateIso) return null;
    return addIntervalIso(
      existingDateIso,
      productData?.orderIntervalFrequency,
      productData?.orderIntervalUnit
    );
  }, [existingDateIso, productData?.orderIntervalFrequency, productData?.orderIntervalUnit]);

  const { mutate: skipItem, isPending: isSaving, error } = useSkipItem({
    onSuccess: async () => {
      shopify.toast.show("Item skipped");
      modalRef.current?.hideOverlay?.();
      void Promise.resolve(onSkipped()).catch((e) => {
        console.warn("Skip succeeded but refresh failed:", e);
      });
    }
  });

  const handleSkip = () => {
    if (!productData || isSaving) return;
    if (!existingDateIso) {
      return;
    }
    skipItem({ subscriptionId: productData.subscriptionId, date: existingDateIso });
  };

  return (
    <s-modal id="skip-item-modal" heading="Skip Item" ref={modalRef}>
      <s-stack gap="base">
        <s-text color="subdued">
          This product will be removed from the upcoming order. It will instead ship on the next available order date
          based on the frequency you selected.
        </s-text>

        {error ? (
          <s-banner tone="critical">
            <s-text>{error.message}</s-text>
          </s-banner>
        ) : null}

        <s-box padding="base" background="base" border="base" borderRadius="base">
          <s-stack direction="inline" alignItems="center" gap="base">
            <s-box padding="none">
              <s-product-thumbnail src={productData?.imageSrc ?? undefined} />
            </s-box>

            <s-stack gap="small">
              {productData?.brand ? (
                <s-text type="small" color="subdued">
                  {productData.brand}
                </s-text>
              ) : null}

              <s-text>{productData?.title ?? ""}</s-text>

              {productData?.subTitle ? (
                <s-text type="small" color="subdued">
                  {productData.subTitle}
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
      </s-stack>

      <s-button slot="primary-action" variant="primary" disabled={!productData || !existingDateIso || isSaving} onClick={handleSkip}>
        {isSaving ? "Skipping..." : "Skip item"}
      </s-button>
    </s-modal>
  );
};


