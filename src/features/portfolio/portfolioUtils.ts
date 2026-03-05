import { PortfolioEntryRow } from '../../db/database';
import { formatIDR, formatUSD } from '../../utils/currency';

/**
 * Check if an entry uses IDR (Indonesian stock).
 */
export function isIdrAsset(entry: Pick<PortfolioEntryRow, 'asset_type' | 'ticker'>): boolean {
  return entry.asset_type === 'stock' && entry.ticker.toUpperCase().endsWith('.JK');
}

/**
 * Format amount in the native currency for an asset.
 * Indonesian stocks → IDR, everything else → USD.
 */
export function formatAssetCurrency(
  amount: number,
  entry: Pick<PortfolioEntryRow, 'asset_type' | 'ticker'>
): string {
  return isIdrAsset(entry) ? formatIDR(amount) : formatUSD(amount);
}

/**
 * Calculate PnL for a single position.
 */
export function calculatePnL(
  buyPrice: number,
  currentPrice: number,
  quantity: number
): { pnl: number; pnlPercent: number } {
  const costBasis = buyPrice * quantity;
  const currentValue = currentPrice * quantity;
  const pnl = currentValue - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { pnl, pnlPercent };
}

/**
 * Sum total current portfolio value in USD.
 * Converts IDR-denominated assets using the provided exchange rate.
 */
export function calculateTotalPortfolioValueUsd(
  entries: Pick<PortfolioEntryRow, 'current_price' | 'quantity' | 'asset_type' | 'ticker'>[],
  usdToIdr: number
): number {
  return entries.reduce((sum, e) => {
    const value = e.current_price * e.quantity;
    return sum + (isIdrAsset(e) ? value / usdToIdr : value);
  }, 0);
}

/**
 * Sum total invested (cost basis) in USD.
 */
export function calculateTotalInvestedUsd(
  entries: Pick<PortfolioEntryRow, 'buy_price' | 'quantity' | 'asset_type' | 'ticker'>[],
  usdToIdr: number
): number {
  return entries.reduce((sum, e) => {
    const value = e.buy_price * e.quantity;
    return sum + (isIdrAsset(e) ? value / usdToIdr : value);
  }, 0);
}

/**
 * Sum total current portfolio value (raw, no conversion).
 */
export function calculateTotalPortfolioValue(
  entries: Pick<PortfolioEntryRow, 'current_price' | 'quantity'>[]
): number {
  return entries.reduce((sum, e) => sum + e.current_price * e.quantity, 0);
}

/**
 * Sum total invested (cost basis, raw, no conversion).
 */
export function calculateTotalInvested(
  entries: Pick<PortfolioEntryRow, 'buy_price' | 'quantity'>[]
): number {
  return entries.reduce((sum, e) => sum + e.buy_price * e.quantity, 0);
}

/**
 * Group entries by asset name and sum current values.
 */
export function groupByAsset(
  entries: Pick<PortfolioEntryRow, 'asset_name' | 'current_price' | 'quantity'>[]
): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const e of entries) {
    groups[e.asset_name] = (groups[e.asset_name] || 0) + e.current_price * e.quantity;
  }
  return groups;
}
