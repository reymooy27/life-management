import {
    calculateMonthlyTotal,
    groupByCategory,
    validateAmountInput,
} from '../financeUtils';

describe('calculateMonthlyTotal', () => {
  it('returns 0 for empty array', () => {
    expect(calculateMonthlyTotal([])).toBe(0);
  });

  it('sums amounts from multiple expenses', () => {
    const expenses = [{ amount: 15000 }, { amount: 30000 }, { amount: 5000 }];
    expect(calculateMonthlyTotal(expenses)).toBe(50000);
  });

  it('handles single expense', () => {
    expect(calculateMonthlyTotal([{ amount: 99000 }])).toBe(99000);
  });
});

describe('groupByCategory', () => {
  it('returns empty object for empty array', () => {
    expect(groupByCategory([])).toEqual({});
  });

  it('groups expenses by category', () => {
    const expenses = [
      { amount: 10000, category: 'Food' },
      { amount: 20000, category: 'Transport' },
      { amount: 5000, category: 'Food' },
    ];
    const result = groupByCategory(expenses);
    expect(result).toEqual({ Food: 15000, Transport: 20000 });
  });

  it('handles single category', () => {
    const expenses = [
      { amount: 10000, category: 'Bills' },
      { amount: 50000, category: 'Bills' },
    ];
    expect(groupByCategory(expenses)).toEqual({ Bills: 60000 });
  });
});

describe('validateAmountInput (IDR - whole numbers only)', () => {
  it('returns number for valid integer', () => {
    expect(validateAmountInput('25000')).toBe(25000);
  });

  it('returns null for empty string', () => {
    expect(validateAmountInput('')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(validateAmountInput('0')).toBeNull();
  });

  it('returns null for negative number', () => {
    expect(validateAmountInput('-5000')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(validateAmountInput('abc')).toBeNull();
  });

  it('returns null for decimal (IDR has no decimals)', () => {
    expect(validateAmountInput('12.50')).toBeNull();
  });

  it('returns null for decimal with many places', () => {
    expect(validateAmountInput('12.999')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(validateAmountInput('  10000  ')).toBe(10000);
  });
});
