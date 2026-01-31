import { useState } from 'preact/hooks';
import { useNavigate } from '../router/hooks';
import { useSubscribeToNextUpcomingOrder } from '../hooks/useSubscribeToNextUpcomingOrder';
import { formatDateToIso, formatDateDisplay } from '../utils/date';

type ProductImageMap = Record<string, string>;

// Helper function to format subscription data
function formatSubscription(subscription, productImageMap: ProductImageMap = {}) {
  // Format frequency text
  const frequency = subscription.order_interval_frequency === 1
    ? `Every ${subscription.order_interval_unit}`
    : `Every ${subscription.order_interval_frequency} ${subscription.order_interval_unit}s`;

  // Format next order date
  const nextOrderDate = formatDateDisplay(subscription.next_charge_scheduled_at, 'short');

  // Extract product title and variant
  const productTitle = subscription.product_title || 'Product';
  const variantTitle = subscription.variant_title || '';

  // Format price
  const price = `$${parseFloat(subscription.price).toFixed(2)}`;

  // Get product image URL from the image map
  const externalVariantId = subscription.external_variant_id?.ecommerce;
  const imageUrl = externalVariantId && productImageMap[String(externalVariantId)]
    ? productImageMap[String(externalVariantId)]
    : `https://cdn.shopify.com/static/images/polaris/patterns/4-pieces.png`;

  return {
    id: subscription.id,
    title: variantTitle,
    frequency: frequency,
    nextOrderDate: nextOrderDate,
    price: price,
    imageUrl: imageUrl,
    status: subscription.status,
    quantity: subscription.quantity,
  };
}

export default function CurrentSubscriptions({
  subscriptionData,
  activeTab = 'active',
  onTabChange,
  nextOrderDateIso = null,
  onResubscribe,
  productImageMap = {},
  onSwap
}) {
  // Ensure subscriptionData is always an array
  const subscriptions = Array.isArray(subscriptionData) ? subscriptionData : [];

  // Filter subscriptions based on active tab
  const filteredSubscriptions = subscriptions.filter(sub => {
    if (activeTab === 'active') {
      return sub.status === 'active';
    } else {
      return sub.status === 'cancelled' || sub.status === 'expired';
    }
  });

  const emptyMessage = activeTab === 'active'
    ? "You don't have any active subscriptions."
    : "You don't have any inactive subscriptions.";

  return (
    <>
      {/* Custom header with tabs */}
      <s-box paddingBlockEnd="base">
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          gap="base"
        >
          <s-heading>Subscriptions</s-heading>
          <s-stack direction="inline" gap="base">
            <s-clickable
              onClick={() => onTabChange && onTabChange('active')}
              padding="small-200"
              borderRadius="base"
              background={activeTab === 'active' ? 'subdued' : 'base'}
            >
              {activeTab === 'active' ? (
                <s-text type="strong">Active subscriptions</s-text>
              ) : (
                <s-text>Active subscriptions</s-text>
              )}
            </s-clickable>
            <s-clickable
              onClick={() => onTabChange && onTabChange('inactive')}
              padding="small-200"
              borderRadius="base"
              background={activeTab === 'inactive' ? 'subdued' : 'base'}
            >
              {activeTab === 'inactive' ? (
                <s-text type="strong">Inactive subscriptions</s-text>
              ) : (
                <s-text>Inactive subscriptions</s-text>
              )}
            </s-clickable>
          </s-stack>
        </s-stack>
      </s-box>

      {/* Content */}
      {filteredSubscriptions.length === 0 ? (
        <s-text color="subdued">{emptyMessage}</s-text>
      ) : (
        <s-grid
          gap="base"
          gridTemplateColumns="repeat(auto-fill, minmax(360px, 360px))"
          justifyContent="start"
        >
          {filteredSubscriptions.map((sub) => {
            const formatted = formatSubscription(sub, productImageMap);
            return (
              <s-grid-item key={sub.id}>
                <ProductCard
                  product={formatted}
                  subscriptionId={sub.id}
                  nextChargeScheduledAt={sub.next_charge_scheduled_at}
                  status={sub.status}
                  nextOrderDateIso={nextOrderDateIso}
                  onResubscribe={onResubscribe}
                  subscription={sub}
                  onSwap={onSwap}
                />
              </s-grid-item>
            );
          })}
        </s-grid>
      )}
    </>
  );
}

function ProductCard({ product, subscriptionId, nextChargeScheduledAt, status, nextOrderDateIso, onResubscribe, subscription, onSwap }) {
  const navigate = useNavigate();
  const modalId = `reschedule-modal-${subscriptionId}`;

  const { mutate: subscribeToNextOrder, isPending: isResubscribing } = useSubscribeToNextUpcomingOrder({
    onSuccess: async () => {
      shopify.toast.show(
        nextOrderDateIso
          ? "Subscription added to upcoming order"
          : "Subscription reactivated for today"
      );
      if (onResubscribe) {
        await onResubscribe();
      }
    },
    onError: (err) => {
      shopify.toast.show(err.message);
    }
  });

  const handleSwapClick = () => {
    if (onSwap && subscription) {
      onSwap(subscription);
    }
  };

  const handleResubscribe = () => {
    if (isResubscribing) return;
    const activationDateIso = nextOrderDateIso ?? formatDateToIso(new Date());
    subscribeToNextOrder({ subscriptionId, nextChargeDateIso: activationDateIso });
  };

  return (
    <s-section>
      <s-stack direction="block" gap="base">
        {/* IMAGE SECTION WITH GRAY BACKGROUND */}
        <s-box>
          <s-image
            src={product.imageUrl}
            alt={product.title}
          />
        </s-box>

        {/* PRODUCT INFO SECTION */}
        <s-stack direction="block" gap="small-400">
          {/* TITLE */}
          <s-heading>{product.title}</s-heading>

          {/* PRICE */}
          <s-text type="strong">{product.price}</s-text>

          {/* FREQUENCY */}
          <s-text color="subdued">
            {product.frequency}{product.nextOrderDate ? ` • Next order ${product.nextOrderDate}` : ''}
          </s-text>
        </s-stack>

        {/* BOTTOM BUTTON ACTIONS */}
        <s-grid gridTemplateColumns="auto 1fr auto" gap="base">
          <s-grid-item>
            <s-button
              variant="secondary"
              onClick={() => navigate(`/subscriptions/${subscriptionId}`)}
            >
              View
            </s-button>
          </s-grid-item>
          {status === 'active' ? (
            <>
              <s-grid-item>
                <s-button
                  variant="secondary"
                  inlineSize="fill"
                  command="--show"
                  commandFor={modalId}
                >
                  Reschedule
                </s-button>
              </s-grid-item>
              <s-grid-item>
                <s-button
                  variant="secondary"
                  disabled={!subscription || !onSwap}
                  command="--show"
                  commandFor="swap-modal"
                  onClick={handleSwapClick}
                >
                  Swap
                </s-button>
              </s-grid-item>
            </>
          ) : (
            <s-grid-item gridColumn="span 2">
              <s-button
                variant="secondary"
                inlineSize="fill"
                onClick={handleResubscribe}
                disabled={isResubscribing}
              >
                {isResubscribing ? (
                  <s-stack direction="inline" alignItems="center" gap="small">
                    <s-spinner accessibilityLabel="Resubscribing" />
                    <s-text>Resubscribing...</s-text>
                  </s-stack>
                ) : (
                  'Resubscribe'
                )}
              </s-button>
            </s-grid-item>
          )}
        </s-grid>
      </s-stack>
    </s-section>
  );
}
