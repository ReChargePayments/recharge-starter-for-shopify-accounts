import { useState, useMemo } from "preact/hooks";
import NextOrder from "../components/next-order";
import { useRecharge } from "../hooks/useRecharge";
import { useSubscriptionsQuery } from "../hooks/useSubscriptionsQuery";
import { useCustomerQuery } from "../hooks/useCustomerQuery";
import { useProductImages } from "../hooks/useProductImages";
import CurrentSubscriptions from "../components/current-subscriptions";
import ChargeErrorBanner from "src/components/charge-error-banner";
import { RescheduleModal } from "../components/reschedule-modal";
import { SwapModal } from "../components/swap-modal";
import { SkipOrderModal } from "../components/skip-order-modal";
import { ProductData } from "../components/types";
import { listSubscriptions } from '@rechargeapps/storefront-client';
import { formatDateToIso, getNextOrderDate } from "../utils/date";
import { subscriptionToProductData, getUpcomingProducts } from "../utils/subscription";

type Subscription = Awaited<ReturnType<typeof listSubscriptions>>['subscriptions'][number];

export default function Subscriptions() {
  const { isLoading } = useRecharge()
  const { data: subsData, isInitialLoading: isLoadingSubs, error: subscriptionsError, refetch: refetchSubscriptions } = useSubscriptionsQuery()
  const { data: customer, isInitialLoading: isLoadingCustomer, error: customerError } = useCustomerQuery()

  // Ensure subs is always an array
  const subs = subsData ?? []

  const [activeTab, setActiveTab] = useState('active')
  const [activeSwapProduct, setActiveSwapProduct] = useState<ProductData | null>(null)

  // Get unique variant IDs from subscriptions for product images
  const variantIds = useMemo(() => {
    return subs
      .map(sub => sub.external_variant_id?.ecommerce)
      .filter((id) => Boolean(id));
  }, [subs]);

  const productImageMap = useProductImages(variantIds);

  // Combine errors from subscriptions query and customer query
  const displayError = subscriptionsError || customerError

  if (isLoading || isLoadingSubs || isLoadingCustomer) {
    return (
      <s-page heading="My subscriptions">
        <s-text color="subdued">Loading subscriptions...</s-text>
      </s-page>
    )
  }

  if (displayError) {
    return (
      <s-page heading="My subscriptions">
        <s-text tone="critical">Error: {displayError instanceof Error ? displayError.message : 'Failed to load subscriptions'}</s-text>
      </s-page>
    )
  }

  // Filter active subscriptions for reschedule modals
  const activeSubscriptions = subs.filter(sub => sub.status === 'active');

  // Calculate next order date for reactivation
  const nextOrderDate = getNextOrderDate(subs);
  const nextOrderDateIso = nextOrderDate ? formatDateToIso(nextOrderDate) : null;

  // Handle swap
  const handleSwap = (subscription: Subscription) => {
    const productData = subscriptionToProductData(subscription, productImageMap);
    setActiveSwapProduct(productData);
  };

  const handleSwapComplete = async () => {
    setActiveSwapProduct(null);
    await reloadSubscriptions();
  };

  // Reload function for resubscribe
  const reloadSubscriptions = async () => {
    await refetchSubscriptions();
  };


  // Calculate upcoming products (subscriptions with the next order date)
  const upcomingProducts = useMemo(() => {
    return getUpcomingProducts(subs, nextOrderDateIso, productImageMap);
  }, [subs, nextOrderDateIso, productImageMap]);

  return (
    <s-stack gap="base">
      <ChargeErrorBanner />

      <NextOrder subscriptionData={subs} customerData={customer} productImageMap={productImageMap} />
      <CurrentSubscriptions
        subscriptionData={subs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        nextOrderDateIso={nextOrderDateIso}
        onResubscribe={reloadSubscriptions}
        productImageMap={productImageMap}
        onSwap={handleSwap}
      />

      {/* Reschedule Modals for each active subscription */}
      {activeSubscriptions.map((sub) => (
        <RescheduleModal
          key={`reschedule-${sub.id}`}
          subscriptionId={sub.id}
          currentChargeDateIso={sub.next_charge_scheduled_at ?? null}
          modalId={`reschedule-modal-${sub.id}`}
          onRescheduled={reloadSubscriptions}
        />
      ))}

      {/* Swap Modal */}
      <SwapModal
        productData={activeSwapProduct}
        onSwapped={handleSwapComplete}
        onClose={() => setActiveSwapProduct(null)}
      />

      {/* Skip Order Modal */}
      <SkipOrderModal
        upcomingProducts={upcomingProducts}
        upcomingDateIso={nextOrderDateIso}
        onSkipped={reloadSubscriptions}
      />
    </s-stack>
  )
}

