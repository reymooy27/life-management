import {
    calculatePnL,
    calculateTotalInvested,
    calculateTotalInvestedUsd,
    calculateTotalPortfolioValue,
    calculateTotalPortfolioValueUsd,
    formatAssetCurrency,
    groupByAsset,
    isIdrAsset,
} from '../portfolioUtils';

describe('isIdrAsset', () => {
  it('returns true for Indonesian .JK stock', () => {
    expect(isIdrAsset({ asset_type: 'stock', ticker: 'BBRI.JK' })).toBe(true);
  });

  it('returns false for US stock', () => {
    expect(isIdrAsset({ asset_type: 'stock', ticker: 'AAPL' })).toBe(false);
  });

  it('returns false for crypto', () => {
    expect(isIdrAsset({ asset_type: 'crypto', ticker: 'BTC' })).toBe(false);
  });

  it('returns false for gold', () => {
    expect(isIdrAsset({ asset_type: 'gold', ticker: 'GC=F' })).toBe(false);
  });
});

describe('formatAssetCurrency', () => {
  it('formats IDR for Indonesian stock', () => {
    const result = formatAssetCurrency(15000, { asset_type: 'stock', ticker: 'BBRI.JK' });
    expect(result).toBe('Rp 15,000');
  });

  it('formats USD for crypto', () => {
    const result = formatAssetCurrency(1234.5, { asset_type: 'crypto', ticker: 'BTC' });
    expect(result).toBe('$1,234.50');
  });
});

describe('calculatePnL', () => {
  it('returns positive PnL when price increased', () => {
    const result = calculatePnL(100, 150, 2);
    expect(result.pnl).toBe(100);
    expect(result.pnlPercent).toBe(50);
  });

  it('returns negative PnL when price decreased', () => {
    const result = calculatePnL(100, 80, 2);
    expect(result.pnl).toBe(-40);
    expect(result.pnlPercent).toBe(-20);
  });

  it('returns zero PnL when price unchanged', () => {
    const result = calculatePnL(100, 100, 5);
    expect(result.pnl).toBe(0);
    expect(result.pnlPercent).toBe(0);
  });

  it('handles zero buy price', () => {
    const result = calculatePnL(0, 100, 1);
    expect(result.pnl).toBe(100);
    expect(result.pnlPercent).toBe(0);
  });

  it('handles fractional quantities', () => {
    const result = calculatePnL(50000, 60000, 0.5);
    expect(result.pnl).toBe(5000);
    expect(result.pnlPercent).toBe(20);
  });
});

describe('calculateTotalPortfolioValue (raw)', () => {
  it('returns 0 for empty array', () => {
    expect(calculateTotalPortfolioValue([])).toBe(0);
  });

  it('sums current_price * quantity', () => {
    const entries = [
      { current_price: 100, quantity: 2 },
      { current_price: 50, quantity: 3 },
    ];
    expect(calculateTotalPortfolioValue(entries)).toBe(350);
  });
});

describe('calculateTotalPortfolioValueUsd', () => {
  it('converts IDR assets to USD', () => {
    const entries = [
      { current_price: 60000, quantity: 0.5, asset_type: 'crypto', ticker: 'BTC' }, // 30000 USD
      { current_price: 16000000, quantity: 1, asset_type: 'stock', ticker: 'BBRI.JK' }, // 16M IDR => 1000 USD at rate 16000
    ];
    const result = calculateTotalPortfolioValueUsd(entries, 16000);
    expect(result).toBe(31000);
  });
});

describe('calculateTotalInvested (raw)', () => {
  it('returns 0 for empty array', () => {
    expect(calculateTotalInvested([])).toBe(0);
  });

  it('sums buy_price * quantity', () => {
    const entries = [
      { buy_price: 100, quantity: 2 },
      { buy_price: 50, quantity: 3 },
    ];
    expect(calculateTotalInvested(entries)).toBe(350);
  });
});

describe('calculateTotalInvestedUsd', () => {
  it('converts IDR assets to USD', () => {
    const entries = [
      { buy_price: 50000, quantity: 1, asset_type: 'crypto', ticker: 'BTC' },
      { buy_price: 8000000, quantity: 2, asset_type: 'stock', ticker: 'BBRI.JK' }, // 16M IDR => 1000 USD
    ];
    const result = calculateTotalInvestedUsd(entries, 16000);
    expect(result).toBe(51000);
  });
});

describe('groupByAsset', () => {
  it('returns empty object for empty array', () => {
    expect(groupByAsset([])).toEqual({});
  });

  it('groups entries by asset name', () => {
    const entries = [
      { asset_name: 'Bitcoin', current_price: 60000, quantity: 0.5 },
      { asset_name: 'Ethereum', current_price: 3000, quantity: 2 },
      { asset_name: 'Bitcoin', current_price: 60000, quantity: 0.3 },
    ];
    const result = groupByAsset(entries);
    expect(result).toEqual({
      Bitcoin: 48000,
      Ethereum: 6000,
    });
  });
});
