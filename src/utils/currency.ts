/**
 * Format a number as Indonesian Rupiah (IDR).
 * Uses comma for thousands separator, no decimals.
 * Example: 150000 → "Rp 150,000"
 */
export function formatIDR(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `Rp ${formatted}`;
}

/**
 * Format a number as US Dollars (USD).
 * Example: 1234.5 → "$1,234.50"
 */
export function formatUSD(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const [whole, decimal] = abs.toFixed(2).split('.');
  const formatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}$${formatted}.${decimal}`;
}
