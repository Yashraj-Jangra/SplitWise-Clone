
export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

export function getGroupCurrencySymbol(group: { currency?: string } | null | undefined): string {
  return group?.currency || '₹';
}

