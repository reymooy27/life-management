/**
 * Price fetching service for portfolio assets.
 * - Crypto: CoinGecko free API (no key)
 * - Stock: Yahoo Finance unofficial API (supports Indonesian .JK tickers)
 * - Gold: Yahoo Finance with GC=F ticker
 */

import { PortfolioEntryRow } from '../../db/database';

// ── CoinGecko ──

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
  LINK: 'chainlink',
  UNI: 'uniswap',
  ATOM: 'cosmos',
  LTC: 'litecoin',
  NEAR: 'near',
  APT: 'aptos',
  ARB: 'arbitrum',
  OP: 'optimism',
  SUI: 'sui',
  SEI: 'sei-network',
  TIA: 'celestia',
  INJ: 'injective-protocol',
  FET: 'fetch-ai',
  RENDER: 'render-token',
  PEPE: 'pepe',
  WIF: 'dogwifcoin',
  SHIB: 'shiba-inu',
};

function getCoinGeckoId(ticker: string): string {
  const upper = ticker.toUpperCase();
  return COINGECKO_IDS[upper] || ticker.toLowerCase();
}

export async function fetchCryptoPrices(
  tickers: string[]
): Promise<Record<string, number>> {
  if (tickers.length === 0) return {};

  const ids = tickers.map(t => getCoinGeckoId(t));
  const uniqueIds = [...new Set(ids)];

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds.join(',')}&vs_currencies=usd`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
    const data = await response.json();

    const result: Record<string, number> = {};
    for (const ticker of tickers) {
      const id = getCoinGeckoId(ticker);
      if (data[id]?.usd != null) {
        result[ticker.toUpperCase()] = data[id].usd;
      }
    }
    return result;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    return {};
  }
}

// ── Yahoo Finance ──

async function fetchYahooFinancePrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    if (!response.ok) throw new Error(`Yahoo Finance API error: ${response.status}`);
    const data = await response.json();

    const meta = data?.chart?.result?.[0]?.meta;
    if (meta?.regularMarketPrice != null) {
      return meta.regularMarketPrice;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching Yahoo Finance price for ${symbol}:`, error);
    return null;
  }
}

export async function fetchStockPrice(ticker: string): Promise<number | null> {
  // If the ticker doesn't already have a suffix, assume it could work as-is
  return fetchYahooFinancePrice(ticker);
}

export async function fetchGoldPrice(): Promise<number | null> {
  return fetchYahooFinancePrice('GC=F');
}

// ── Unified price fetch ──

export interface PriceResult {
  ticker: string;
  assetType: string;
  price: number | null;
}

export async function fetchAllPrices(
  entries: Pick<PortfolioEntryRow, 'ticker' | 'asset_type'>[]
): Promise<PriceResult[]> {
  const results: PriceResult[] = [];

  // Group by asset type
  const cryptoTickers: string[] = [];
  const stockEntries: { ticker: string }[] = [];
  let needsGold = false;

  const seen = new Set<string>();
  for (const entry of entries) {
    const key = `${entry.asset_type}:${entry.ticker.toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    switch (entry.asset_type) {
      case 'crypto':
        cryptoTickers.push(entry.ticker);
        break;
      case 'stock':
        stockEntries.push({ ticker: entry.ticker });
        break;
      case 'gold':
        needsGold = true;
        break;
      // 'custom' — no fetching needed
    }
  }

  // Fetch crypto prices in batch
  if (cryptoTickers.length > 0) {
    const cryptoPrices = await fetchCryptoPrices(cryptoTickers);
    for (const ticker of cryptoTickers) {
      results.push({
        ticker: ticker.toUpperCase(),
        assetType: 'crypto',
        price: cryptoPrices[ticker.toUpperCase()] ?? null,
      });
    }
  }

  // Fetch stock prices individually
  for (const entry of stockEntries) {
    const price = await fetchStockPrice(entry.ticker);
    results.push({
      ticker: entry.ticker.toUpperCase(),
      assetType: 'stock',
      price,
    });
  }

  // Fetch gold price
  if (needsGold) {
    const goldPrice = await fetchGoldPrice();
    results.push({
      ticker: 'GOLD',
      assetType: 'gold',
      price: goldPrice,
    });
  }

  return results;
}

/**
 * Check if a stock ticker is an Indonesian stock (.JK suffix).
 */
export function isIdStock(ticker: string): boolean {
  return ticker.toUpperCase().endsWith('.JK');
}

/**
 * Fetch the current USD to IDR exchange rate from Yahoo Finance.
 */
export async function fetchUsdToIdrRate(): Promise<number> {
  try {
    const price = await fetchYahooFinancePrice('USDIDR=X');
    if (price != null) return price;
  } catch (error) {
    console.error('Error fetching USD/IDR rate:', error);
  }
  // Fallback rate
  return 16000;
}
