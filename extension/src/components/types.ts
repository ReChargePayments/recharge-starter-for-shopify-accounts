export type ProductData = {
  subscriptionId: number;
  externalProductId: number | string;
  externalVariantId: number | string;
  brand: string;
  title: string;
  subTitle: string;
  price: string;
  scheduledDate: string;
  /** Raw ISO date from Recharge, e.g. "2026-03-12" */
  nextChargeScheduledAt?: string | null;
  /** Used to power the frequency dropdown */
  orderIntervalFrequency?: number;
  orderIntervalUnit?: string;
  quantity?: number;
  canSwap?: boolean;
  showAddToCartButton?: boolean;
  imageSrc?: string;
}

