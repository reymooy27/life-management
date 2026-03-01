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
