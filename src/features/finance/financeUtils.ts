import { ExpenseEntryRow } from '../../db/database';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Bills',
  'Entertainment',
  'Other',
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = ['Cash', 'Debit', 'Credit'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * Sum total amount from an array of expense entries.
 */
export function calculateMonthlyTotal(expenses: Pick<ExpenseEntryRow, 'amount'>[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

/**
 * Group expenses by category and return a map of category → total.
 */
export function groupByCategory(
  expenses: Pick<ExpenseEntryRow, 'amount' | 'category'>[]
): Record<string, number> {
  const groups: Record<string, number> = {};
  for (const expense of expenses) {
    groups[expense.category] = (groups[expense.category] || 0) + expense.amount;
  }
  return groups;
}

/**
 * Validate a string as a positive integer amount (IDR, no decimals).
 * Returns the parsed number, or null if invalid.
 */
export function validateAmountInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  // Only allow whole numbers (no decimals for IDR)
  if (!/^\d+$/.test(trimmed)) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}
