/**
 * Date utility functions for formatting and parsing Recharge date strings
 */

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD)
 */
export function formatDateToIso(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a Recharge date string (handles both ISO timestamps and date-only formats)
 * Returns null if the date string is invalid
 */
export function parseRechargeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    const date = dateStr.includes('T')
      ? new Date(dateStr)
      : new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (e) {
    return null;
  }
}

/**
 * Format a date string for display
 * @param dateStr - Date string from Recharge (ISO or date-only format)
 * @param format - Display format: 'short' (Jan 15) or 'long' (January 15, 2026)
 */
export function formatDateDisplay(
  dateStr: string | null | undefined,
  format: 'short' | 'long' = 'short'
): string {
  if (!dateStr) return '';
  
  const date = parseRechargeDate(dateStr);
  if (!date) return '';

  try {
    const month = format === 'long'
      ? date.toLocaleDateString('en-US', { month: 'long' })
      : date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    
    if (format === 'long') {
      const year = date.getFullYear();
      return `${month} ${day}, ${year}`;
    }
    
    return `${month} ${day}`;
  } catch (e) {
    console.error('Error formatting date:', e);
    return '';
  }
}

/**
 * Find the earliest upcoming order date from active subscriptions
 */
export function getNextOrderDate(subscriptions: Array<{ next_charge_scheduled_at?: string | null; status?: string }>): Date | null {
  const dates = subscriptions
    .filter(sub => sub.next_charge_scheduled_at && sub.status === 'active')
    .map(sub => parseRechargeDate(sub.next_charge_scheduled_at!))
    .filter((date): date is Date => date !== null)
    .sort((a, b) => a.getTime() - b.getTime());

  return dates[0] || null;
}
