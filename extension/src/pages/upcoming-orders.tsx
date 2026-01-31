import { useMemo } from 'preact/hooks';
import { useNavigate } from '../router';
import { useRecharge } from '../hooks/useRecharge';
import { useChargesQuery } from '../hooks/useChargesQuery';
import { useSubscriptionsQuery } from '../hooks/useSubscriptionsQuery';
import { useCustomerQuery } from '../hooks/useCustomerQuery';
import { useProductImages } from '../hooks/useProductImages';
import { listSubscriptions, Charge } from '@rechargeapps/storefront-client';
import { formatDateToIso, formatDateDisplay } from '../utils/date';
import { formatAddress } from '../utils/address';

type Subscription = Awaited<ReturnType<typeof listSubscriptions>>['subscriptions'][number];

interface Address {
  id: number;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
}


interface UpcomingOrder {
  scheduledDate: string; // ISO date string (YYYY-MM-DD)
  scheduledDateFormatted: string; // Formatted for display
  chargeId: number; // First charge ID for this date (for navigation)
  address: Address | null;
  addressFormatted: string;
  itemCount: number;
  productImages: string[]; // Up to 2 images
  totalPrice: number;
}

export default function UpcomingOrders() {
  const navigate = useNavigate();
  const { isLoading: isRechargeLoading } = useRecharge();
  const todayIso = useMemo(() => formatDateToIso(new Date()), []);

  // Fetch queued charges starting from today
  const { data: charges, isInitialLoading: isLoadingCharges } = useChargesQuery({
    sort_by: 'scheduled_at-asc',
    status: ['queued'],
    scheduled_at_min: todayIso,
    limit: 100,
    include: ['payment_methods'],
  });

  const { data: subscriptions, isInitialLoading: isLoadingSubscriptions } = useSubscriptionsQuery();
  const { data: customer, isInitialLoading: isLoadingCustomer } = useCustomerQuery();

  // Get all variant IDs from subscriptions for product images
  const variantIds = useMemo(() => {
    if (!subscriptions) return [];
    return subscriptions
      .map(sub => sub.external_variant_id?.ecommerce)
      .filter((id) => Boolean(id));
  }, [subscriptions]);

  const productImageMap = useProductImages(variantIds);

  // Group charges by scheduled date and build upcoming orders
  const upcomingOrders = useMemo((): UpcomingOrder[] => {
    if (!charges || !subscriptions || !customer) return [];

    // Group charges by scheduled date (YYYY-MM-DD)
    const chargesByDate = new Map<string, Charge[]>();
    for (const charge of charges) {
      if (!charge.scheduled_at) continue;
      const dateKey = charge.scheduled_at.slice(0, 10);
      const existing = chargesByDate.get(dateKey) || [];
      existing.push(charge);
      chargesByDate.set(dateKey, existing);
    }

    // Build upcoming orders from grouped charges
    const orders: UpcomingOrder[] = [];
    for (const [dateKey, dateCharges] of chargesByDate.entries()) {
      // Get first charge for navigation
      const firstCharge = dateCharges[0];
      if (!firstCharge) continue;

      // Find subscriptions scheduled for this date
      const subscriptionsOnDate = subscriptions.filter((sub: Subscription) => {
        if (sub.status !== 'active' || !sub.next_charge_scheduled_at) return false;
        const subDate = sub.next_charge_scheduled_at.slice(0, 10);
        return subDate === dateKey;
      });

      // Calculate item count
      const itemCount = subscriptionsOnDate.reduce((sum, sub) => sum + (sub.quantity || 1), 0);

      // Get product images (up to 2)
      const images: string[] = [];
      for (const sub of subscriptionsOnDate.slice(0, 2)) {
        const variantId = sub.external_variant_id?.ecommerce;
        if (variantId && productImageMap[String(variantId)]) {
          images.push(productImageMap[String(variantId)]);
        }
      }
      // Fallback image if no images found
      if (images.length === 0) {
        images.push('https://cdn.shopify.com/static/images/polaris/patterns/4-pieces.png');
      }

      // Calculate total price
      const totalPrice = dateCharges.reduce((sum, charge) => {
        return sum + parseFloat(charge.total_price || '0');
      }, 0);

      // Get address
      const addressId = firstCharge.address_id;
      const address = customer?.include?.addresses?.find((addr: Address) => addr.id === addressId) || null;

      orders.push({
        scheduledDate: dateKey,
        scheduledDateFormatted: formatDateDisplay(dateKey, 'long'),
        chargeId: firstCharge.id,
        address,
        addressFormatted: formatAddress(address || undefined),
        itemCount,
        productImages: images,
        totalPrice,
      });
    }

    // Sort by scheduled date (ascending)
    return orders.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [charges, subscriptions, customer, productImageMap]);

  const isLoading = isRechargeLoading || isLoadingCharges || isLoadingSubscriptions || isLoadingCustomer;

  if (isLoading) {
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
        <s-section>
          <s-stack direction="inline" alignItems="center" gap="small">
            <s-spinner accessibilityLabel="Loading upcoming orders" />
            <s-text color="subdued">Loading upcoming orders...</s-text>
          </s-stack>
        </s-section>
      </>
    );
  }

  if (upcomingOrders.length === 0) {
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
        <s-section>
          <s-stack gap="base">
            <s-text color="subdued">You don't have any upcoming orders scheduled.</s-text>
          </s-stack>
        </s-section>
      </>
    );
  }

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

      <s-section>
        <s-stack gap="base">

          {/* Orders List */}
          <s-stack gap="base">
            {upcomingOrders.map((order) => (
              <s-box
                key={order.scheduledDate}
                padding="base"
                background="base"
                border="base"
                borderRadius="base"
              >
                <s-stack gap="base">
                  {/* Date Header */}
                  <s-heading>{order.scheduledDateFormatted}</s-heading>

                  {/* Main Content Row */}
                  <s-stack direction="inline" gap="base" alignItems="start" justifyContent="space-between">
                    <s-stack direction="inline" gap="base" alignItems="start">
                      {/* Product Images */}
                      <s-stack direction="inline" gap="small">
                        {order.productImages.slice(0, 2).map((imageUrl, idx) => (
                          <s-product-thumbnail
                            key={idx}
                            alt={`Product ${idx + 1}`}
                            size="base"
                            src={imageUrl}
                          />
                        ))}
                      </s-stack>

                      {/* Order Details */}
                      <s-stack direction="block" gap="small-200">
                        <s-text>
                          <s-text type="strong">{order.itemCount}</s-text>{' '}
                          {order.itemCount === 1 ? 'item' : 'items'}
                        </s-text>
                        {order.addressFormatted && (
                          <s-text color="subdued">
                            Delivering to: {order.addressFormatted}
                          </s-text>
                        )}
                        <s-text color="subdued">
                          Total: ${order.totalPrice.toFixed(2)}
                        </s-text>
                      </s-stack>
                    </s-stack>

                    {/* View Order Button */}
                    <s-button
                      variant="primary"
                      onClick={() => navigate(`/charges/${order.chargeId}`)}
                    >
                      View Order
                    </s-button>
                  </s-stack>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        </s-stack>
      </s-section>
    </>
  );
}
