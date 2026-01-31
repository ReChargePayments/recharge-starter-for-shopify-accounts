import { useMemo } from 'preact/hooks';
import { useChargesQuery } from '../hooks/useChargesQuery';
import { useNavigate } from '../router';
import { formatDateToIso, formatDateDisplay } from '../utils/date';
import { formatAddress } from '../utils/address';
import { Charge } from '@rechargeapps/storefront-client';
import { formatPaymentMethod } from '../utils/payment';

// Helper function to format charge data for display
function formatCharge(charges: Charge[], productImageMap = {}, subscriptions = []) {
  if (!charges || charges.length === 0) return null;

  const firstCharge = charges[0];
  const scheduledDate = firstCharge.scheduled_at ? firstCharge.scheduled_at.slice(0, 10) : null;

  // Sum up total price from all charges
  const totalPrice = charges.reduce((sum, charge) => {
    return sum + parseFloat(charge.total_price || '0');
  }, 0);

  // Find all subscriptions scheduled for this date to get total items and image
  const subscriptionsOnDate = subscriptions.filter(sub => {
    if (!sub.next_charge_scheduled_at || sub.status !== 'active') return false;
    const subDate = sub.next_charge_scheduled_at.slice(0, 10);
    return subDate === scheduledDate;
  });

  // Sum up quantities from all subscriptions on this date
  const totalItems = subscriptionsOnDate.reduce((sum, sub) => {
    return sum + (sub.quantity || 1);
  }, 0);

  // Get product image from first subscription on this date
  let imageUrl = `https://cdn.shopify.com/static/images/polaris/patterns/4-pieces.png`;
  if (subscriptionsOnDate.length > 0) {
    const firstSub = subscriptionsOnDate[0];
    const variantId = firstSub.external_variant_id?.ecommerce;
    if (variantId && productImageMap[String(variantId)]) {
      imageUrl = productImageMap[String(variantId)];
    }
  }

  return {
    date: scheduledDate,
    totalItems,
    totalPrice,
    imageUrl,
    charge: firstCharge, // Keep first charge for address/payment info
  };
}


export default function NextOrder({ subscriptionData, customerData, productImageMap = {} }) {
  const navigate = useNavigate();
  const todayIso = useMemo(() => formatDateToIso(new Date()), []);

  // Fetch queued charges starting from today
  const { data: chargesData, isInitialLoading } = useChargesQuery({
    sort_by: 'scheduled_at-asc',
    status: ['queued'],
    scheduled_at_min: todayIso,
    limit: 50,
    include: ['payment_methods'],
  });

  // Ensure charges is always an array
  const charges = chargesData ?? []

  // Process charges to find next delivery
  const nextDelivery = useMemo(() => {
    if (!charges || charges.length === 0) return null;

    const firstCharge = charges[0];
    const chargeDate = firstCharge.scheduled_at ? firstCharge.scheduled_at.slice(0, 10) : null;

    if (!chargeDate) return null;

    // Filter to only charges on the exact same date
    const chargesOnDate = charges.filter(charge => {
      const chargeDateStr = charge.scheduled_at ? charge.scheduled_at.slice(0, 10) : null;
      return chargeDateStr === chargeDate;
    });

    return formatCharge(chargesOnDate.length > 0 ? chargesOnDate : [firstCharge], productImageMap, subscriptionData || []);
  }, [charges, productImageMap, subscriptionData]);

  // Don't show if loading or no upcoming delivery
  if (isInitialLoading || !nextDelivery) {
    return null;
  }

  const formattedDate = formatDateDisplay(nextDelivery.date, 'short');
  const itemText = nextDelivery.totalItems === 1 ? 'item' : 'items';
  const formattedPrice = `$${nextDelivery.totalPrice.toFixed(2)}`;

  // Get address from charge
  const charge = nextDelivery.charge;
  const addressId = charge.address_id;
  const address = customerData?.include?.addresses?.find(addr => addr.id === addressId)
    || customerData?.addresses?.[0];
  const formattedAddress = formatAddress(address || undefined);

  // Get payment method from charge or customer data
  const paymentMethod = charge.payment_methods?.[0]?.payment_details
    || customerData?.include?.payment_methods?.[0]?.payment_details;
  const formattedPaymentMethod = formatPaymentMethod(paymentMethod, '');

  return (
    <s-section>
      <s-box>
        <s-stack direction="block" gap="base">
          {/* HEADING */}
          <s-heading>
            {formattedDate ? `Your next order processes on ${formattedDate}` : 'Your next order is scheduled'}
          </s-heading>

          {/* MAIN CONTENT ROW */}
          <s-stack
            direction="inline"
            gap="base"
            alignItems="center"
            justifyContent="space-between"
          >
            <s-stack direction="inline" gap="base" alignItems="center">
              <s-product-thumbnail
                alt="Next order preview"
                size="base"
                src={nextDelivery.imageUrl}
              ></s-product-thumbnail>

              <s-stack direction="block" gap="small-100">
                <s-paragraph color="subdued">
                  {formattedAddress
                    ? `We'll deliver ${nextDelivery.totalItems} ${itemText} to ${formattedAddress}.`
                    : `We'll deliver ${nextDelivery.totalItems} ${itemText}.`
                  }
                </s-paragraph>
                <s-paragraph color="subdued">
                  {formattedPaymentMethod
                    ? `${formattedPrice} will be charged to your ${formattedPaymentMethod}.`
                    : `${formattedPrice} will be charged.`
                  }
                </s-paragraph>
              </s-stack>
            </s-stack>

            <s-stack direction="inline" gap="small">
              <s-button
                variant="secondary"
                onClick={() => {
                  if (nextDelivery?.charge?.id) {
                    navigate(`/charges/${nextDelivery.charge.id}`);
                  }
                }}
              >
                View and manage order
              </s-button>
              <s-button
                variant="secondary"
                commandFor="skip-order-modal"
                command="--show"
              >
                Skip Order
              </s-button>
            </s-stack>
          </s-stack>

          {/* FOOTER LINK */}
          <s-link onClick={() => navigate('/upcoming-orders')}>
            View all upcoming orders
          </s-link>
        </s-stack>
      </s-box>
    </s-section>
  );
}
