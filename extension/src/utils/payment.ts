/**
 * Payment utility functions for formatting payment method data
 */

interface PaymentMethod {
  brand?: string;
  last4?: string;
}

/**
 * Format a payment method for display
 * Returns formatted string like "Visa ••••1234" or "No payment method" if not available
 */
export function formatPaymentMethod(
  paymentMethod: PaymentMethod | null | undefined,
  fallback: string = 'No payment method'
): string {
  if (!paymentMethod) return fallback;
  
  const brand = paymentMethod.brand || 'Card';
  const last4 = paymentMethod.last4 || '';
  
  if (last4) {
    return `${brand} ••••${last4}`;
  }
  
  return fallback;
}
