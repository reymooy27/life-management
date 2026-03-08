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
 * Group entries by ticker and sum current values.
 * (WARNING: Returns mixed currencies if IDR and USD are present.)
 */
export function groupByAsset(
  entries: Pick<PortfolioEntryRow, 'ticker' | 'current_price' | 'quantity'>[]
): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const e of entries) {
    const ticker = e.ticker.toUpperCase();
    groups[ticker] = (groups[ticker] || 0) + e.current_price * e.quantity;
  }
  return groups;
}

/**
 * Group entries by ticker and sum current values normalized to USD.
 * This ensures percentages in Pie Charts are accurate globally.
 */
export function groupByAssetUsdContext(
  entries: Pick<PortfolioEntryRow, 'ticker' | 'current_price' | 'quantity' | 'asset_type'>[],
  usdToIdr: number
): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const e of entries) {
    const ticker = e.ticker.toUpperCase();
    const rawValue = e.current_price * e.quantity;
    const normalizedValue = isIdrAsset(e) ? rawValue / usdToIdr : rawValue;
    groups[ticker] = (groups[ticker] || 0) + normalizedValue;
  }
  return groups;
}

export interface GroupedPortfolioEntry {
  asset_name: string;
  ticker: string;
  asset_type: string;
  total_quantity: number;
  average_buy_price: number;
  current_price: number;
  total_value: number;
  total_invested: number;
}

/**
 * Group portfolio entries by ticker and asset_type to aggregate multiple purchases.
 */
export function groupHoldings(
  entries: PortfolioEntryRow[]
): GroupedPortfolioEntry[] {
  const grouped = new Map<string, GroupedPortfolioEntry>();

  for (const entry of entries) {
    // Unique key per asset
    const key = `${entry.asset_type}-${entry.ticker.toUpperCase()}`;
    const invested = entry.buy_price * entry.quantity;
    const currentValue = entry.current_price * entry.quantity;

    if (grouped.has(key)) {
      const existing = grouped.get(key)!;
      existing.total_quantity += entry.quantity;
      existing.total_invested += invested;
      existing.total_value += currentValue;
      // Average buy price = total invested / total quantity
      existing.average_buy_price = existing.total_quantity > 0 
        ? existing.total_invested / existing.total_quantity 
        : 0;
    } else {
      grouped.set(key, {
        asset_name: entry.asset_name,
        ticker: entry.ticker.toUpperCase(),
        asset_type: entry.asset_type,
        total_quantity: entry.quantity,
        average_buy_price: entry.buy_price,
        current_price: entry.current_price,
        total_value: currentValue,
        total_invested: invested,
      });
    }
  }

  return Array.from(grouped.values());
}
