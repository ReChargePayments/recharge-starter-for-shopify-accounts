/**
 * Subscription utility functions for transforming Recharge subscription data
 */

import { listSubscriptions } from '@rechargeapps/storefront-client';
import { formatDateDisplay } from './date';
import type { ProductData } from '../components/types';

type Subscription = Awaited<ReturnType<typeof listSubscriptions>>['subscriptions'][number];

type ProductImageMap = Record<string, string>;

/**
 * Transform a Recharge subscription into ProductData format
 */
export function subscriptionToProductData(
  subscription: Subscription,
  productImageMap: ProductImageMap = {}
): ProductData {
  // Format the next charge date
  const scheduledDate = formatDateDisplay(subscription.next_charge_scheduled_at, 'short');

  // Get the product image from the map using external_variant_id
  const externalVariantId = subscription.external_variant_id?.ecommerce;
  const imageSrc = externalVariantId && productImageMap
    ? productImageMap[String(externalVariantId)]
    : undefined;

  return {
    subscriptionId: subscription.id,
    externalProductId: subscription.external_product_id?.ecommerce || '',
    externalVariantId: subscription.external_variant_id?.ecommerce || '',
    brand: '', // Recharge doesn't provide brand info directly
    title: subscription.product_title,
    subTitle: subscription.variant_title || '',
    price: `$${parseFloat(subscription.price).toFixed(2)}`,
    scheduledDate,
    nextChargeScheduledAt: subscription.next_charge_scheduled_at ?? null,
    orderIntervalFrequency: subscription.order_interval_frequency,
    orderIntervalUnit: subscription.order_interval_unit,
    canSwap: subscription.status === 'active',
    quantity: subscription.quantity,
    imageSrc: imageSrc || `https://cdn.shopify.com/static/images/polaris/patterns/4-pieces.png`,
  };
}

/**
 * Filter and transform subscriptions that are scheduled for the next order date
 */
export function getUpcomingProducts(
  subscriptions: Subscription[],
  nextOrderDateIso: string | null,
  productImageMap: ProductImageMap = {}
): ProductData[] {
  if (!nextOrderDateIso || !subscriptions.length) return [];

  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');

  return activeSubscriptions
    .filter(sub => {
      const subDateIso = sub.next_charge_scheduled_at
        ? sub.next_charge_scheduled_at.slice(0, 10)
        : null;
      return subDateIso === nextOrderDateIso;
    })
    .map(sub => subscriptionToProductData(sub, productImageMap));
}
