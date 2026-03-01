import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExpenseBarChart from '../components/ExpenseBarChart';
import {
    addExpense,
    deleteExpense,
    ExpenseEntryRow,
    getMonthlyExpenses,
} from '../db/database';
import {
    calculateMonthlyTotal,
    EXPENSE_CATEGORIES,
    ExpenseCategory,
    groupByCategory,
    PAYMENT_METHODS,
    PaymentMethod,
    validateAmountInput,
} from '../features/finance/financeUtils';
import { formatIDR } from '../utils/currency';

const CATEGORY_EMOJIS: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Bills: '📄',
  Entertainment: '🎬',
  Other: '📦',
};

const PAYMENT_EMOJIS: Record<string, string> = {
  Cash: '💵',
  Debit: '💳',
  Credit: '🏦',
};

function getYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function formatMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
}

export default function FinanceScreen() {
  const navigation = useNavigation();
  const [currentMonth, setCurrentMonth] = useState(getYearMonth(new Date()));
  const [expenses, setExpenses] = useState<ExpenseEntryRow[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [error, setError] = useState('');

  const loadExpenses = useCallback(async () => {
    const rows = await getMonthlyExpenses(currentMonth);
    setExpenses(rows);
  }, [currentMonth]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses])
  );

  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    setCurrentMonth(getYearMonth(d));
  };

  const handleAdd = async () => {
    if (!description.trim()) {
      setError('Enter a description');
      return;
    }
    const amt = validateAmountInput(amount);
    if (amt === null) {
      setError('Enter a valid amount (whole number)');
      return;
    }
    setError('');
    const today = new Date().toISOString().split('T')[0];
    await addExpense(description.trim(), amt, category, today, paymentMethod);
    setDescription('');
    setAmount('');
    await loadExpenses();
  };

  const handleDelete = async (id: number) => {
    await deleteExpense(id);
    await loadExpenses();
  };

  const monthlyTotal = calculateMonthlyTotal(expenses);
  const categoryBreakdown = groupByCategory(expenses);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Header with Back */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Finance</Text>
        </View>

        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatMonth(currentMonth)}</Text>
          <TouchableOpacity onPress={() => navigateMonth(1)}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Monthly Summary */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Spent</Text>
          <Text style={styles.totalValue}>
            {formatIDR(monthlyTotal)}
          </Text>
        </View>

        {/* Expense Chart */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Spending Breakdown</Text>
            <ExpenseBarChart
              data={categoryBreakdown}
              accentColor="#FFB74D"
              categoryEmojis={CATEGORY_EMOJIS}
            />
          </View>
        )}

        {/* Add Expense */}
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Add Expense</Text>

          <TextInput
            style={styles.input}
            placeholder="Description"
            placeholderTextColor="#666"
            value={description}
            onChangeText={text => {
              setDescription(text);
              setError('');
            }}
          />

          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Amount (IDR)"
              placeholderTextColor="#666"
              value={amount}
              onChangeText={text => {
                setAmount(text);
                setError('');
              }}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Category Picker */}
          <Text style={styles.pickerLabel}>Category</Text>
          <View style={styles.chipPicker}>
            {EXPENSE_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  category === cat && styles.chipActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    category === cat && styles.chipTextActive,
                  ]}
                >
                  {CATEGORY_EMOJIS[cat]} {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment Method Picker */}
          <Text style={styles.pickerLabel}>Payment Method</Text>
          <View style={styles.chipPicker}>
            {PAYMENT_METHODS.map(method => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.chip,
                  paymentMethod === method && styles.chipActivePayment,
                ]}
                onPress={() => setPaymentMethod(method)}
              >
                <Text
                  style={[
                    styles.chipText,
                    paymentMethod === method && styles.chipTextActive,
                  ]}
                >
                  {PAYMENT_EMOJIS[method]} {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* Expense List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          {expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No expenses this month.
              </Text>
            </View>
          ) : (
            expenses.map(entry => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryIcon}>
                  <Text>{CATEGORY_EMOJIS[entry.category] || '📦'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryDesc}>{entry.description}</Text>
                  <Text style={styles.entryMeta}>
                    {entry.date} · {entry.category} · {PAYMENT_EMOJIS[entry.payment_method] || ''} {entry.payment_method}
                  </Text>
                </View>
                <Text style={styles.entryAmount}>
                  {formatIDR(entry.amount)}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(entry.id)}
                >
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  backArrow: {
    fontSize: 20,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 24,
  },
  navArrow: {
    fontSize: 32,
    color: '#FFB74D',
    fontWeight: 'bold',
    paddingHorizontal: 12,
  },
  monthText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  totalCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFB74D',
  },
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  formContainer: {
    padding: 24,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 15,
    marginBottom: 8,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#FFB74D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#000',
  },
  pickerLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
  },
  chipActive: {
    backgroundColor: '#FFB74D',
    borderColor: '#FFB74D',
  },
  chipActivePayment: {
    backgroundColor: '#BB86FC',
    borderColor: '#BB86FC',
  },
  chipText: {
    fontSize: 13,
    color: '#ccc',
  },
  chipTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  errorText: {
    color: '#CF6679',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  listContainer: {
    padding: 24,
    paddingTop: 0,
  },
  emptyState: {
    padding: 24,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyStateText: {
    color: '#666',
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  entryDesc: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  entryMeta: {
    fontSize: 12,
    color: '#888',
  },
  entryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFB74D',
    marginRight: 12,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#CF6679',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
