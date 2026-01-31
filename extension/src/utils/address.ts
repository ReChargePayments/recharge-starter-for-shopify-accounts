/**
 * Address utility functions for formatting Recharge address data
 */

interface Address {
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

/**
 * Format an address as a comma-separated string
 * Returns empty string if address is null/undefined
 */
export function formatAddress(address: Address | null | undefined): string {
  if (!address) return '';
  
  const parts: string[] = [];
  if (address.address1) parts.push(address.address1);
  if (address.address2) parts.push(address.address2);
  if (address.city) parts.push(address.city);
  if (address.province) parts.push(address.province);
  if (address.zip) parts.push(address.zip);
  
  return parts.join(', ');
}

/**
 * Format contact name from address (first name + last name)
 * Returns 'N/A' if no name is available
 */
export function formatContactName(address: Address | null | undefined): string {
  if (!address) return 'N/A';
  
  const name = `${address.first_name || ''} ${address.last_name || ''}`.trim();
  return name || 'N/A';
}
