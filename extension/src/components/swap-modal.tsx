import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { productSearch } from "@rechargeapps/storefront-client";
import { SwapOptionCard, type SwapVariantOption } from "../components/swap-option-card";
import { ProductData } from "../components/types";
import { useRechargeSession } from "../contexts/RechargeSessionContext";
import { useSwapSubscriptionVariant } from "../hooks/useSwapSubscriptionVariant";

export const SwapModal = ({
  productData,
  onSwapped,
  onClose,
}: {
  productData: ProductData | null;
  onSwapped: () => void | Promise<void>;
  onClose?: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [options, setOptions] = useState<SwapVariantOption[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const closeBtnRef = useRef<any>(null);
  const modalRef = useRef<any>(null);
  const { getSession } = useRechargeSession();

  const { mutate: swapVariant, isPending: isSaving, error: swapError } = useSwapSubscriptionVariant({
    onSuccess: async () => {
      shopify.toast.show("Swap saved");
      modalRef.current?.hideOverlay?.();
      void Promise.resolve(onSwapped()).catch((e) => {
        console.warn("Swap succeeded but refresh failed:", e);
      });
    }
  });

  const currentExternalVariantId = useMemo(() => {
    if (!productData) return null;
    return String(productData.externalVariantId ?? "");
  }, [productData]);

  const filteredOptions = useMemo(() => {
    if (!currentExternalVariantId) return options;
    return options.filter((o) => o.variantExternalId !== currentExternalVariantId);
  }, [options, currentExternalVariantId]);

  const selected = filteredOptions.find((o) => o.variantExternalId === selectedVariantId) ?? null;

  useEffect(() => {
    // Reset when changing the subscription we're swapping
    setSelectedVariantId(null);
    setQueryError(null);
    setOptions([]);

    if (!productData) return;
    const smartSelectProductId = productData.externalProductId?.toString?.() ?? String(productData.externalProductId);
    if (!smartSelectProductId) return;

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const session = await getSession();

        const res = await productSearch(session, {
          limit: 25,
          format_version: "2022-06",
          smart_select_product_id: smartSelectProductId,
          product_published_status: "published",
          variant_published_status: "published",
        } as any);

        const mapped: SwapVariantOption[] = (res.products ?? []).flatMap((p: any) => {
          const productImage =
            p.images?.[0]?.medium || p.images?.[0]?.large || p.images?.[0]?.small || p.images?.[0]?.original;
          return (p.variants ?? []).map((v: any) => {
            const variantImage =
              v.image?.medium || v.image?.large || v.image?.small || v.image?.original || productImage;
            return {
              variantExternalId: String(v.external_variant_id),
              productExternalId: String(p.external_product_id),
              brand: p.brand ?? p.vendor ?? null,
              title: p.title ?? "",
              // Keep this short like existing ProductCard "subTitle"
              description: v.title ?? null,
              imageSrc: variantImage ?? null,
            };
          });
        });

        if (!cancelled) setOptions(mapped);
      } catch (e) {
        if (!cancelled) setQueryError(e instanceof Error ? e.message : "Failed to load swap options");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productData]);

  const handleClose = () => {
    modalRef.current?.hideOverlay?.();
    // Reset productData by calling onClose (which will set activeSwapProduct to null)
    // Only reset if swap wasn't successful (onSwapped will be called after successful swap)
    if (!isSaving && onClose) {
      onClose();
    }
  };

  const handleSave = () => {
    if (!productData || !selected || isSaving) return;
    swapVariant({
      subscriptionId: productData.subscriptionId,
      newExternalVariantId: selected.variantExternalId,
      options: { commit: true }
    });
  };

  const error = queryError || swapError?.message || null;

  return (
    <s-modal id="swap-modal" heading="Swap Item" ref={modalRef}>
      <s-stack gap="base">
        <s-text color="subdued">
          Choose a variant to swap to{productData ? ` (replacing "${productData.title}")` : ""}.
        </s-text>

        {error ? (
          <s-banner tone="critical">
            <s-text>{error}</s-text>
          </s-banner>
        ) : null}

        {isLoading ? (
          <s-stack direction="inline" alignItems="center" gap="small">
            <s-spinner accessibilityLabel="Loading swap options" />
            <s-text>Loading options...</s-text>
          </s-stack>
        ) : (
          <s-stack gap="small">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((o) => (
                <SwapOptionCard
                  key={o.variantExternalId}
                  option={o}
                  selected={o.variantExternalId === selectedVariantId}
                  onSelect={() => setSelectedVariantId(o.variantExternalId)}
                />
              ))
            ) : (
              <s-text color="subdued">No swap options found.</s-text>
            )}
          </s-stack>
        )}
      </s-stack>

      <s-button
        id="swap-modal-close"
        slot="secondary-actions"
        commandFor="swap-modal"
        command="--hide"
        ref={closeBtnRef}
        onClick={handleClose}
      >
        Close
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        disabled={!selected || isSaving || isLoading}
        onClick={handleSave}
      >
        {isSaving ? "Saving..." : "Save"}
      </s-button>
    </s-modal>
  )
}
