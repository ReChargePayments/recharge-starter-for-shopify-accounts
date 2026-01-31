import { useState, useMemo } from 'preact/hooks';
import { useParams, useNavigate } from '../router';
import { useRecharge } from '../hooks/useRecharge';
import { useSubscriptionsQuery } from '../hooks/useSubscriptionsQuery';
import { useCustomerQuery } from '../hooks/useCustomerQuery';
import { useChargesQuery } from '../hooks/useChargesQuery';
import { useProductImages } from '../hooks/useProductImages';
import { useRescheduleCharge } from '../hooks/useRescheduleCharge';
import { useSkipCharge } from '../hooks/useSkipCharge';
import { ChargeRescheduleModal } from '../components/charge-reschedule-modal';
import { formatDateDisplay } from '../utils/date';
import { formatAddress, formatContactName } from '../utils/address';
import { formatPaymentMethod } from '../utils/payment';
import { Charge, listSubscriptions } from '@rechargeapps/storefront-client';

type Subscription = Awaited<ReturnType<typeof listSubscriptions>>['subscriptions'][number];

export default function ChargeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isLoading: isRechargeLoading } = useRecharge();

  const chargeId = id ? parseInt(id, 10) : null;

  // Fetch all charges (no status filter) so we can find any charge by ID
  const { data: allChargesData, isInitialLoading: isLoadingCharges, error: chargesError, refetch: refetchCharges } = useChargesQuery({
    limit: 100,
    include: ['payment_methods'],
    // No status filter - need to find any charge (queued, skipped, error, etc.)
  });

  const { data: allSubscriptionsData, isInitialLoading: isLoadingSubscriptions, error: subscriptionsError, refetch: refetchSubscriptions } = useSubscriptionsQuery();

  const { data: customer, isInitialLoading: isLoadingCustomer, error: customerError } = useCustomerQuery();

  // Mutation hooks
  const { mutate: rescheduleCharge, isPending: isRescheduling, error: rescheduleError } = useRescheduleCharge({
    onSuccess: async () => {
      await refetchCharges();
      await refetchSubscriptions();
    },
    onError: (err) => {
      shopify.toast.show(err.message);
    }
  });

  const { mutate: skipCharge, isPending: isSkipping, error: skipError } = useSkipCharge({
    onSuccess: async () => {
      shopify.toast.show('Order skipped');
      navigate('/');
    },
    onError: (err) => {
      shopify.toast.show(err.message);
    }
  });

  const isUpdating = isRescheduling || isSkipping;
  const updateError = rescheduleError?.message || skipError?.message || null;

  // Ensure arrays are always arrays
  const allCharges = allChargesData ?? []
  const allSubscriptions = allSubscriptionsData ?? []

  // Find the charge
  const charge = useMemo(() => {
    if (!chargeId || !allCharges) return null;
    return allCharges.find((c: Charge) => c.id === chargeId) || null;
  }, [chargeId, allCharges]);

  // Find related subscriptions
  const subscriptions = useMemo(() => {
    if (!charge || !allSubscriptions) return [];

    const chargeDate = charge.scheduled_at ? charge.scheduled_at.slice(0, 10) : null;
    return allSubscriptions.filter((sub: Subscription) => {
      if (chargeDate && sub.next_charge_scheduled_at) {
        const subDate = sub.next_charge_scheduled_at.slice(0, 10);
        return subDate === chargeDate && sub.status === 'active';
      }
      return false;
    });
  }, [charge, allSubscriptions]);

  // Get variant IDs for product images
  const variantIds = useMemo(() => {
    return subscriptions
      .map(sub => sub.external_variant_id?.ecommerce)
      .filter((id) => Boolean(id));
  }, [subscriptions]);

  const productImageMap = useProductImages(variantIds);

  const isLoadingData = isRechargeLoading || isLoadingCharges || isLoadingSubscriptions || isLoadingCustomer;
  const error = chargesError || subscriptionsError || customerError || (chargeId && !charge ? 'Charge not found' : null);

  const handleReschedule = (newDateIso: string) => {
    if (isRescheduling || !charge) return;
    rescheduleCharge({ chargeId: charge.id, newDateIso });
  };

  const handleSkip = () => {
    if (isSkipping || !charge) return;
    const subscriptionIds = subscriptions.map(sub => sub.id);
    skipCharge({ chargeId: charge.id, subscriptionIds });
  };

  if (isRechargeLoading || isLoadingData) {
    return (
      <s-page heading="Loading...">
        <s-section>
          <s-text color="subdued">Loading order details...</s-text>
        </s-section>
      </s-page>
    );
  }

  if (error || !charge) {
    return (
      <s-page heading="Error">
        <s-section>
          <s-stack direction="block" gap="base">
            <s-banner tone="critical">
              <s-text>{error || 'Order not found'}</s-text>
            </s-banner>
            <s-button onClick={() => navigate('/')}>
              Back to subscriptions
            </s-button>
          </s-stack>
        </s-section>
      </s-page>
    );
  }

  // Format scheduled date
  const scheduledDate = formatDateDisplay(charge.scheduled_at, 'long');

  // Get address
  const addressId = charge.address_id;
  const address =
    customer?.include?.addresses?.find((addr) => addr.id === addressId) ||
    customer?.include?.addresses?.[0];

  const formattedShippingAddress = formatAddress(address || undefined);
  const contactName = formatContactName(address || undefined);
  const contactPhone = address?.phone || 'N/A';

  // Get payment method
  const paymentMethod = charge?.include?.payment_methods?.[0]?.payment_details
    || customer?.include?.payment_methods?.[0]?.payment_details;
  const paymentDisplay = formatPaymentMethod(paymentMethod);

  const totalPrice = parseFloat(charge.total_price || '0');
  const formattedTotalPrice = `$${totalPrice.toFixed(2)}`;

  // Calculate total items
  const totalItems = subscriptions.reduce((sum, sub) => sum + (sub.quantity || 1), 0);

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
            {/* Order Summary Card */}
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>Order Summary</s-heading>

                {subscriptions.length > 0 ? (
                  <s-stack direction="block" gap="base">
                    {subscriptions.map((sub) => {
                      const variantId = sub.external_variant_id?.ecommerce;
                      const imageUrl = variantId && productImageMap[String(variantId)]
                        ? productImageMap[String(variantId)]
                        : `https://cdn.shopify.com/static/images/polaris/patterns/4-pieces.png`;

                      return (
                        <s-box key={sub.id} padding="base" background="subdued" border="base" borderRadius="base">
                          <s-stack direction="inline" gap="base" alignItems="center" justifyContent="space-between">
                            <s-stack direction="inline" gap="base" alignItems="center">
                              <s-product-thumbnail alt={sub.product_title} size="base" src={imageUrl} />
                              <s-stack direction="block" gap="small-100">
                                <s-text type="strong">{sub.product_title}</s-text>
                                {sub.variant_title && <s-text color="subdued">{sub.variant_title}</s-text>}
                                <s-text color="subdued">
                                  Quantity: {sub.quantity} × ${parseFloat(sub.price).toFixed(2)}
                                </s-text>
                              </s-stack>
                            </s-stack>
                            <s-button
                              variant="secondary"
                              onClick={() => navigate(`/subscriptions/${sub.id}`)}
                            >
                              Edit
                            </s-button>
                          </s-stack>
                        </s-box>
                      );
                    })}
                  </s-stack>
                ) : (
                  <s-text color="subdued">No items found for this order.</s-text>
                )}

                <s-divider />

                <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                  <s-text type="strong">Total</s-text>
                  <s-text type="strong">{formattedTotalPrice}</s-text>
                </s-stack>
              </s-stack>
            </s-box>

            {/* Order Details Card */}
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>Order Details</s-heading>

                <s-stack direction="block" gap="base">
                  {/* Contact Information */}
                  <s-text-field
                    label="Contact Name"
                    value={contactName}
                    readOnly
                  />
                  <s-text-field
                    label="Email"
                    value={customer?.email || 'N/A'}
                    readOnly
                  />
                  <s-text-field
                    label="Phone"
                    value={contactPhone}
                    readOnly
                  />

                  {/* Shipping Address */}
                  <s-text-field
                    label="Shipping Address"
                    value={formattedShippingAddress}
                    readOnly
                  />

                  {/* Billing Address (same as shipping for now) */}
                  <s-text-field
                    label="Billing Address"
                    value={formattedShippingAddress}
                    readOnly
                  />

                  {/* Payment Method */}
                  <s-text-field
                    label="Payment Method"
                    value={paymentDisplay}
                    readOnly
                  />
                </s-stack>
              </s-stack>
            </s-box>
          </s-stack>
        </s-grid-item>

        {/* Right Column */}
        <s-grid-item>
          <s-stack direction="block" gap="base">
            {/* Order Summary Card */}
            <s-box padding="base" background="base" border="base" borderRadius="base">
              <s-stack direction="block" gap="base">
                <s-heading>Order Information</s-heading>
                {scheduledDate && (
                  <s-text>
                    Scheduled: {scheduledDate}
                  </s-text>
                )}
                <s-text>
                  Items: {totalItems}
                </s-text>
                <s-text>
                  Total: {formattedTotalPrice}
                </s-text>
                <s-text color="subdued">
                  Status: {charge.status || 'Unknown'}
                </s-text>
              </s-stack>
            </s-box>

            {/* Action Buttons */}
            {charge.status === 'queued' && (
              <s-stack direction="block" gap="base">
                <s-button
                  inlineSize='fill'
                  variant="secondary"
                  disabled={isUpdating}
                  command="--show"
                  commandFor="reschedule-charge-modal"
                >
                  Reschedule
                </s-button>
                <s-button
                  variant="secondary"
                  inlineSize='fill'
                  disabled={isUpdating}
                  onClick={handleSkip}
                >
                  Skip
                </s-button>
              </s-stack>
            )}

            {/* Loading indicator */}
            {isUpdating && (
              <s-stack direction="inline" alignItems="center" gap="small">
                <s-spinner accessibilityLabel="Updating order" />
                <s-text>Updating...</s-text>
              </s-stack>
            )}
          </s-stack>
        </s-grid-item>
      </s-grid>

      {/* Reschedule Modal - Custom implementation for charges */}
      {charge && (
        <ChargeRescheduleModal
          chargeId={charge.id}
          currentChargeDateIso={charge.scheduled_at ?? null}
          onRescheduled={handleReschedule}
        />
      )}
    </>
  );
}
