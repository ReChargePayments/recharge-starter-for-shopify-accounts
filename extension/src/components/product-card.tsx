import { ProductData } from "./types";
import { useChangeQuantity } from "../hooks/useChangeQuantity";
import { useChangeFrequency } from "../hooks/useChangeFrequency";
import { useCancelSubscription } from "../hooks/useCancelSubscription";
import { useAddActiveSubscriptionToUpcomingOrder } from "../hooks/useAddActiveSubscriptionToUpcomingOrder";

type Props = {
  product: ProductData;
  handleOnClick: (productData: ProductData, action: "swap" | "cancel" | "skip") => void;
  onUpdated?: () => void | Promise<void>;
  showAddToCartButton?: boolean;
  upcomingOrderDateIso?: string | null;
};

export const ProductCard = ({
  product,
  showAddToCartButton = false,
  upcomingOrderDateIso,
  handleOnClick,
  onUpdated,
}: Props) => {
  const {
    subscriptionId,
    brand,
    title,
    subTitle,
    price,
    scheduledDate,
    nextChargeScheduledAt,
    orderIntervalFrequency,
    orderIntervalUnit,
    canSwap,
    imageSrc,
  } = product;

  const { mutate: updateQuantity, isPending: isUpdatingQuantity } = useChangeQuantity({
    onSuccess: async () => {
      await onUpdated?.();
      shopify.toast.show("Quantity updated");
    }
  });

  const { mutate: updateFrequency, isPending: isUpdatingFrequency } = useChangeFrequency({
    onSuccess: async () => {
      await onUpdated?.();
      shopify.toast.show("Frequency updated");
    }
  });

  const { mutate: cancelSubscription, isPending: isCancelling } = useCancelSubscription({
    onSuccess: async () => {
      await onUpdated?.();
      shopify.toast.show("Subscription cancelled");
    }
  });

  const { mutate: addToUpcomingOrder, isPending: isAddingToOrder } = useAddActiveSubscriptionToUpcomingOrder({
    onSuccess: async () => {
      await onUpdated?.();
      shopify.toast.show("Added to upcoming order");
    }
  });

  const isUpdating = isUpdatingQuantity || isUpdatingFrequency || isCancelling || isAddingToOrder;

  const handleUpdateQuantity = (newQuantity: number) => {
    if (isUpdating) return;
    if (!Number.isFinite(newQuantity) || newQuantity < 1) return;
    updateQuantity({ subscriptionId, newQuantity });
  };

  const handleUpdateFrequency = (frequencyValue: string) => {
    if (isUpdating) return;
    const frequency = Number(frequencyValue);
    if (!Number.isFinite(frequency) || frequency <= 0) return;
    updateFrequency({
      subscriptionId,
      input: {
        orderIntervalFrequency: frequency,
        orderIntervalUnit: (orderIntervalUnit ?? "month") as any,
        chargeIntervalFrequency: frequency,
      }
    });
  };

  const handleCancel = () => {
    if (isUpdating) return;
    cancelSubscription({
      subscriptionId,
      input: {
        reason: "Customer cancelled in portal"
      }
    });
  };

  const handleAddToUpcomingOrder = () => {
    if (isUpdating) return;
    if (!upcomingOrderDateIso) {
      shopify.toast.show("No upcoming order date to add to");
      return;
    }
    addToUpcomingOrder({
      subscriptionId,
      upcomingDateIso: upcomingOrderDateIso,
      options: { commit: true }
    });
  };

  return (
    <>
      <s-stack direction="inline" justifyContent="space-between">
        <s-stack direction="inline" >
          <s-box padding="none base" >
            <s-product-thumbnail src={imageSrc ?? undefined} />
          </s-box>
          <s-stack inlineSize="150px">
            <s-text type="small" color="subdued">
              {brand}
            </s-text>
            <s-text>
              {title}
            </s-text>
            <s-text type="small" color="subdued">
              {subTitle}
            </s-text>
            <s-text type="strong">
              {price}
            </s-text>
          </s-stack>
        </s-stack>
        <s-stack gap="base">
          {isUpdating ? (
            <s-stack direction="inline" alignItems="center" gap="small">
              <s-spinner accessibilityLabel="Updating subscription" />
              <s-text>Updating...</s-text>
            </s-stack>
          ) : (
            <>
              <s-stack gap="base" direction="inline">
                <s-box inlineSize="115px">
                  <s-number-field
                    controls="stepper"
                    onBlur={(e) => handleUpdateQuantity(Number(e.currentTarget.value))}
                    defaultValue={(product.quantity ?? 1).toString()}
                    name="quantity"
                  />
                </s-box>
                <s-box inlineSize="122px">
                  <s-select
                    label="Frequency"
                    onChange={(e) => handleUpdateFrequency(e.currentTarget.value)}
                    name="frequency"
                  >
                    <s-option defaultSelected={(orderIntervalFrequency ?? 1) === 1} value="1" >
                      1 Month
                    </s-option>
                    <s-option defaultSelected={orderIntervalFrequency === 2} value="2" >
                      2 Months
                    </s-option>
                    <s-option defaultSelected={orderIntervalFrequency === 3} value="3" >
                      3 Months
                    </s-option>
                  </s-select>
                </s-box>
              </s-stack>
              <s-box>
                <s-badge color="subdued" icon="calendar" size="small">
                  <s-text color="subdued" type="small">
                    Scheduled {" "}
                    {scheduledDate}
                  </s-text>
                </s-badge>
              </s-box>
              {showAddToCartButton && (
                <s-button
                  slot="primary-action"
                  onClick={handleAddToUpcomingOrder}
                  inlineSize="fill"
                  variant="primary"
                  disabled={!upcomingOrderDateIso}
                >
                  Add to Cart
                </s-button>
              )}
              <s-stack direction="inline" gap="base">
                {canSwap && (
                  <s-link command="--show" commandFor="swap-modal" onClick={() => handleOnClick(product, 'swap')}>
                    <s-text type="small">
                      Swap Item
                    </s-text>
                  </s-link>
                )}
                <s-link command="--show" commandFor="skip-item-modal" onClick={() => handleOnClick(product, 'skip')}>
                  <s-text type="small">Skip Item</s-text>
                </s-link>
                <s-link onClick={(e) => { e.preventDefault(); handleCancel(); }}>
                  <s-text type="small">
                    Cancel
                  </s-text>
                </s-link>
              </s-stack>
            </>
          )}
        </s-stack>
      </s-stack>
    </>
  )
}
