
export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

/**
 * Returns the application standard currency symbol (INR ₹)
 */
export function getGroupCurrencySymbol(_group?: { currency?: string } | null | undefined): string {
  return CURRENCY_SYMBOL;
}


