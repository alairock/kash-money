/**
 * Formats a number as currency with comma separators
 * @param amount - The number to format
 * @returns Formatted string like "$1,234.56"
 */
export const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
