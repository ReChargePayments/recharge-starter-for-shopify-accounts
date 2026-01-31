import { useState, useMemo } from 'preact/hooks';
import { useParams, useNavigate } from '../router';
import { useRecharge } from '../hooks/useRecharge';
import { useSubscriptionById } from '../hooks/useSubscriptionById';
import { useCustomerQuery } from '../hooks/useCustomerQuery';
import { useProductImages } from '../hooks/useProductImages';
import { useSubscriptionsQuery } from '../hooks/useSubscriptionsQuery';
import { useChangeQuantity } from '../hooks/useChangeQuantity';
import { useChangeFrequency } from '../hooks/useChangeFrequency';
import { useCancelSubscription } from '../hooks/useCancelSubscription';
import { SwapModal } from '../components/swap-modal';
import { RescheduleModal } from '../components/reschedule-modal';
import { SkipItemModal } from '../components/skip-item-modal';
import { ProductData } from '../components/types';
import { formatDateDisplay } from '../utils/date';
import { formatAddress } from '../utils/address';
import { formatPaymentMethod } from '../utils/payment';
import { subscriptionToProductData } from '../utils/subscription';

export default function SubscriptionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: isRechargeLoading } = useRecharge();

  const subscriptionId = id ? parseInt(id, 10) : null;

  const { data: subscription, isInitialLoading: isLoadingSubscription, error: subscriptionError } = useSubscriptionById(subscriptionId);
  const { data: customer, isInitialLoading: isLoadingCustomer, error: customerError } = useCustomerQuery();
  const { refetch: refetchSubscriptions } = useSubscriptionsQuery();

  const variantId = subscription?.external_variant_id?.ecommerce;
  const productImageMap = useProductImages(variantId ? [variantId] : []);
  const [activeSwapProduct, setActiveSwapProduct] = useState<ProductData | null>(null);
  const [activeSkipProduct, setActiveSkipProduct] = useState<ProductData | null>(null);

  const isLoadingData = isLoadingSubscription || isLoadingCustomer;
  const error = subscriptionError || customerError;

  // Convert subscription to ProductData format
  const productData = useMemo(() => {
    if (!subscription) return null;
    return subscriptionToProductData(subscription, productImageMap);
  }, [subscription, productImageMap]);

  // Mutation hooks
  const { mutate: updateQuantity, isPending: isUpdatingQuantity, error: quantityError } = useChangeQuantity({
    onSuccess: async () => {
      shopify.toast.show('Quantity updated');
      await refetchSubscriptions();
    },
    onError: (err) => {
      shopify.toast.show(err.message);
    }
  });

  const { mutate: updateFrequency, isPending: isUpdatingFrequency, error: frequencyError } = useChangeFrequency({
    onSuccess: async () => {
      shopify.toast.show('Frequency updated');
      await refetchSubscriptions();
    },
    onError: (err) => {
      shopify.toast.show(err.message);
    }
  });

  const { mutate: cancelSubscription, isPending: isCancelling, error: cancelError } = useCancelSubscription({
    onSuccess: async () => {
      shopify.toast.show('Subscription cancelled');
      await refetchSubscriptions();
      navigate('/');
    },
    onError: (err) => {
      shopify.toast.show(err.message);
    }
  });

  const isUpdating = isUpdatingQuantity || isUpdatingFrequency || isCancelling;
  const updateError = quantityError?.message || frequencyError?.message || cancelError?.message || null;

  // Handle quantity update
  const handleUpdateQuantity = (newQuantity: number) => {
    if (isUpdating || !subscriptionId) return;
    if (!Number.isFinite(newQuantity) || newQuantity < 1) return;
    updateQuantity({ subscriptionId, newQuantity, options: { commit: true } });
  };

  // Handle frequency update
  const handleUpdateFrequency = (frequencyValue: string) => {
    if (isUpdating || !subscription) return;
    const frequency = Number(frequencyValue);
    if (!Number.isFinite(frequency) || frequency <= 0) return;
    updateFrequency({
      subscriptionId: subscriptionId!,
      input: {
        orderIntervalFrequency: frequency,
        orderIntervalUnit: (subscription.order_interval_unit ?? 'month') as any,
        chargeIntervalFrequency: frequency,
      },
      options: { commit: true }
    });
  };

  // Handle swap
  const handleSwap = () => {
    if (productData) {
      setActiveSwapProduct(productData);
    }
  };

  const handleSwapComplete = async () => {
    setActiveSwapProduct(null);
    // Refetch data to get latest updates
    await refetchSubscriptions();
  };

  // Handle skip
  const handleSkip = () => {
    if (productData) {
      setActiveSkipProduct(productData);
    }
  };

  const handleSkipComplete = async () => {
    setActiveSkipProduct(null);
    // Refetch data to get latest updates
    await refetchSubscriptions();
  };

  // Handle cancel confirmation
  const handleCancelConfirm = () => {
    if (isCancelling || !subscriptionId) return;
    cancelSubscription({
      subscriptionId,
      input: {
        reason: 'Customer cancelled in portal',
      },
      options: { commit: true }
    });
  };

  if (isRechargeLoading || isLoadingData) {
    return (
      <s-page heading="Loading...">
        <s-section>
          <s-text color="subdued">Loading subscription details...</s-text>
        </s-section>
      </s-page>
    );
  }

  if (error || !subscription) {
    return (
      <s-page heading="Error">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-banner tone="critical">
              <s-text>{error || 'Subscription not found'}</s-text>
            </s-banner>
            <s-button onClick={() => navigate('/')}>
              Back to subscriptions
            </s-button>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  // Format data
  const productTitle = subscription.product_title || 'Product';
  const variantTitle = subscription.variant_title || '';
  const price = `$${parseFloat(subscription.price).toFixed(2)}`;
  const currentQuantity = subscription.quantity || 1;
  const frequency =
    subscription.order_interval_frequency === 1
      ? `Every ${subscription.order_interval_unit}`
      : `Every ${subscription.order_interval_frequency} ${subscription.order_interval_unit}s`;

  // Format next order date
  const nextOrderDate = formatDateDisplay(subscription.next_charge_scheduled_at, 'long');

  // Get address
  const addressId = subscription.address_id;
  const address =
    customer?.include?.addresses?.find((addr) => addr.id === addressId) ||
    customer?.include?.addresses?.[0];
  const formattedAddress = formatAddress(address || undefined);

  // Get payment method
  const paymentMethod = customer?.include?.payment_methods?.[0]?.payment_details;
  const paymentDisplay = formatPaymentMethod(paymentMethod);

  // Get product image
  const externalVariantId = subscription.external_variant_id?.ecommerce;
  const imageUrl = externalVariantId && productImageMap[String(externalVariantId)]
    ? productImageMap[String(externalVariantId)]
    : `https://cdn.shopify.com/static/images/polaris/patterns/4-pieces.png`;

  return (
    <>
      {/* Custom Header */}
      <s-box paddingBlockEnd="base">
        <s-stack
          direction="inline"
          justifyContent="space-between"
          alignItems="center"
          gap="base"
        >
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-clickable onClick={() => navigate('/')}>
              <s-icon type="arrow-left" />
            </s-clickable>
            <s-text color="subdued">Back to Subscriptions</s-text>
          </s-stack>
        </s-stack>
      </s-box>

      {/* Error Banner */}
      {updateError && (
        <s-banner tone="critical">
          <s-text>{updateError}</s-text>
        </s-banner>
      )}

      {/* Main Content - Two Column Layout */}
      <s-grid gridTemplateColumns="2fr 1fr" gap="base" alignItems="start">
        {/* Left Column */}
        <s-grid-item>
          <s-stack direction="block" gap="base">
            {/* Product Overview Card */}
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="inline" gap="base" alignItems="center">
                <s-product-thumbnail alt={productTitle} size="base" src={imageUrl} />
                <s-stack direction="block" gap="small-100">
                  <s-heading>{productTitle}</s-heading>
                  {variantTitle && <s-text>{variantTitle}</s-text>}
                  <s-text color="subdued">
                    {currentQuantity} x {price} • {frequency}
                  </s-text>
                </s-stack>
              </s-stack>
            </s-box>

            {/* Product Options Card */}
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>Product options</s-heading>

                {/* Info Banner */}
                <s-banner tone="info">
                  Changes you make here will affect all future deliveries.
                </s-banner>

                {/* Form Fields */}
                <s-stack direction="block" gap="base">
                  {/* Variant Title (read-only) */}
                  {variantTitle && (
                    <s-text-field
                      label="Variant"
                      value={variantTitle}
                      readOnly
                    />
                  )}

                  {/* Quantity and Frequency */}
                  <s-stack gap="base" direction="inline">
                    <s-box inlineSize="115px">
                      <s-number-field
                        controls="stepper"
                        onBlur={(e) => handleUpdateQuantity(Number((e.currentTarget as HTMLInputElement).value))}
                        defaultValue={(subscription.quantity ?? 1).toString()}
                        name="quantity"
                        disabled={isUpdating}
                      />
                    </s-box>
                    <s-box inlineSize="122px">
                      <s-select
                        label="Frequency"
                        onChange={(e) => handleUpdateFrequency((e.currentTarget as HTMLSelectElement).value)}
                        name="frequency"
                        disabled={isUpdating}
                      >
                        <s-option defaultSelected={(subscription.order_interval_frequency ?? 1) === 1} value="1">
                          1 Month
                        </s-option>
                        <s-option defaultSelected={subscription.order_interval_frequency === 2} value="2">
                          2 Months
                        </s-option>
                        <s-option defaultSelected={subscription.order_interval_frequency === 3} value="3">
                          3 Months
                        </s-option>
                      </s-select>
                    </s-box>
                  </s-stack>

                  {/* Shipping Address */}
                  <s-text-field
                    label="Shipping address"
                    value={formattedAddress}
                    readOnly
                  />

                  {/* Payment */}
                  <s-text-field label="Payment" value={paymentDisplay} readOnly />
                </s-stack>

                {/* Loading indicator */}
                {isUpdating && (
                  <s-stack direction="inline" alignItems="center" gap="small">
                    <s-spinner accessibilityLabel="Updating subscription" />
                    <s-text>Updating...</s-text>
                  </s-stack>
                )}
              </s-stack>
            </s-box>
          </s-stack>
        </s-grid-item>

        {/* Right Column */}
        <s-grid-item>
          <s-stack direction="block" gap="base">
            {/* Subscription Summary Card */}
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>Your subscription to this product</s-heading>
                <s-text>Delivery: {frequency}</s-text>
                {nextOrderDate && (
                  <s-text>
                    Next order: {nextOrderDate}
                  </s-text>
                )}
                <s-text color="subdued">
                  Status: {subscription.status}
                </s-text>
              </s-stack>
            </s-box>

            {/* Action Buttons */}
            {subscription.status === 'active' && (
              <s-stack direction="block" gap="base">
                <s-button
                  inlineSize='fill'
                  variant="secondary"
                  disabled={isUpdating || !productData}
                  command="--show"
                  commandFor="swap-modal"
                  onClick={handleSwap}
                >
                  Swap
                </s-button>
                <s-button
                  inlineSize='fill'
                  variant="secondary"
                  disabled={isUpdating}
                  command="--show"
                  commandFor="reschedule-modal"
                >
                  Reschedule
                </s-button>
                <s-button
                  variant="secondary"
                  inlineSize='fill'
                  disabled={isUpdating || !productData}
                  command="--show"
                  commandFor="skip-item-modal"
                  onClick={handleSkip}
                >
                  Skip
                </s-button>
                <s-button
                  variant="secondary"
                  inlineSize='fill'
                  tone="critical"
                  disabled={isUpdating}
                  command="--show"
                  commandFor="cancel-modal"
                >
                  Cancel
                </s-button>
              </s-stack>
            )}
          </s-stack>
        </s-grid-item>
      </s-grid>

      {/* Swap Modal */}
      <SwapModal
        productData={activeSwapProduct}
        onSwapped={handleSwapComplete}
      />

      {/* Reschedule Modal */}
      {subscription && (
        <RescheduleModal
          subscriptionId={subscription.id}
          currentChargeDateIso={subscription.next_charge_scheduled_at ?? null}
          onRescheduled={async () => {
            await refetchSubscriptions();
          }}
        />
      )}

      {/* Skip Item Modal */}
      <SkipItemModal
        productData={activeSkipProduct}
        onSkipped={handleSkipComplete}
      />

      {/* Cancel Confirmation Modal */}
      <s-modal id="cancel-modal" heading="Cancel Subscription" size="small-100">
        <s-stack gap="base">
          <s-text>
            Are you sure you want to cancel this subscription? This action cannot be undone.
          </s-text>
          {updateError && (
            <s-banner tone="critical">
              <s-text>{updateError}</s-text>
            </s-banner>
          )}
        </s-stack>
        <s-button
          slot="secondary-actions"
          commandFor="cancel-modal"
          command="--hide"
        >
          Keep Subscription
        </s-button>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          disabled={isCancelling}
          onClick={handleCancelConfirm}
        >
          {isCancelling ? (
            <s-stack direction="inline" alignItems="center" gap="small">
              <s-spinner accessibilityLabel="Cancelling" size="small" />
              <s-text>Cancelling...</s-text>
            </s-stack>
          ) : (
            'Cancel Subscription'
          )}
        </s-button>
      </s-modal>
    </>
  );
}
