import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ExpensePieChart from '../components/ExpensePieChart';
import YearlyBarChart from '../components/YearlyBarChart';
import {
    deleteExpense,
    ExpenseEntryRow,
    getMonthlyExpenses,
    getYearlyExpenses,
} from '../db/database';
import {
    calculateMonthlyTotal,
    EXPENSE_CATEGORIES,
    groupByCategory,
    PAYMENT_METHODS,
} from '../features/finance/financeUtils';
import { RootStackParamList } from '../types/navigation';
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(getYearMonth(now));
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [expenses, setExpenses] = useState<ExpenseEntryRow[]>([]);
  const [yearlyExpenses, setYearlyExpenses] = useState<ExpenseEntryRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterPayment, setFilterPayment] = useState<string>('All');

  // Load monthly expenses
  useEffect(() => {
    let isCurrent = true;
    (async () => {
      const rows = await getMonthlyExpenses(currentMonth);
      if (isCurrent) setExpenses(rows);
    })();
    return () => { isCurrent = false; };
  }, [currentMonth, refreshKey]);

  // Load yearly expenses
  useEffect(() => {
    let isCurrent = true;
    (async () => {
      const rows = await getYearlyExpenses(currentYear);
      if (isCurrent) setYearlyExpenses(rows);
    })();
    return () => { isCurrent = false; };
  }, [currentYear, refreshKey]);

  // Reload on focus
  useFocusEffect(
    useCallback(() => {
      setRefreshKey(k => k + 1);
    }, [])
  );

  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + direction, 1);
    setCurrentMonth(getYearMonth(d));
    setCurrentYear(d.getFullYear());
  };

  const navigateYear = (direction: -1 | 1) => {
    setCurrentYear(prev => prev + direction);
  };

  const confirmDelete = (id: number, desc: string) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete "${desc}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteExpense(id);
            setRefreshKey(k => k + 1);
          },
        },
      ]
    );
  };

  // Computed values
  const monthlyTotal = calculateMonthlyTotal(expenses);
  const categoryBreakdown = groupByCategory(expenses);
  const yearlyTotal = calculateMonthlyTotal(yearlyExpenses);

  const yearlyMonthlyData = useMemo(() => {
    const data: Record<number, number> = {};
    for (const e of yearlyExpenses) {
      const month = parseInt(e.date.split('-')[1], 10);
      data[month] = (data[month] || 0) + e.amount;
    }
    return data;
  }, [yearlyExpenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filterCategory !== 'All' && e.category !== filterCategory) return false;
      if (filterPayment !== 'All' && e.payment_method !== filterPayment) return false;
      return true;
    });
  }, [expenses, filterCategory, filterPayment]);

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => navigateMonth(-1)}>
            <Ionicons name="chevron-back" size={28} color="#FFB74D" />
          </TouchableOpacity>
          <Text style={styles.monthText}>{formatMonth(currentMonth)}</Text>
          {currentMonth < getYearMonth(new Date()) ? (
            <TouchableOpacity onPress={() => navigateMonth(1)}>
              <Ionicons name="chevron-forward" size={28} color="#FFB74D" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 28 }} />
          )}
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Monthly</Text>
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatIDR(monthlyTotal)}
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Yearly</Text>
            <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatIDR(yearlyTotal)}
            </Text>
          </View>
        </View>

        {/* Category Breakdown */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Spending Breakdown</Text>
            <ExpensePieChart
              data={categoryBreakdown}
              categoryEmojis={CATEGORY_EMOJIS}
            />
          </View>
        )}

        {/* Yearly Bar Chart */}
        <View style={styles.chartContainer}>
          <View style={styles.yearNav}>
            <TouchableOpacity onPress={() => navigateYear(-1)}>
              <Ionicons name="chevron-back" size={22} color="#FFB74D" />
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>{currentYear} Overview</Text>
            {currentYear < new Date().getFullYear() ? (
              <TouchableOpacity onPress={() => navigateYear(1)}>
                <Ionicons name="chevron-forward" size={22} color="#FFB74D" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 22 }} />
            )}
          </View>
          <YearlyBarChart
            monthlyData={yearlyMonthlyData}
            accentColor="#FFB74D"
            year={currentYear}
          />
        </View>

        {/* Transaction Table */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Transactions</Text>

          {/* Filters */}
          <View style={styles.filterRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {['All', ...EXPENSE_CATEGORIES].map(cat => (
                <TouchableOpacity
                  key={`fc-${cat}`}
                  style={[
                    styles.filterChip,
                    filterCategory === cat && styles.filterChipActive,
                  ]}
                  onPress={() => setFilterCategory(cat)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterCategory === cat && styles.filterChipTextActive,
                    ]}
                  >
                    {cat === 'All' ? '🏷️ All' : `${CATEGORY_EMOJIS[cat]} ${cat}`}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.filterSpacer} />

              {['All', ...PAYMENT_METHODS].map(method => (
                <TouchableOpacity
                  key={`fp-${method}`}
                  style={[
                    styles.filterChip,
                    filterPayment === method && styles.filterChipActivePayment,
                  ]}
                  onPress={() => setFilterPayment(method)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterPayment === method && styles.filterChipTextActive,
                    ]}
                  >
                    {method === 'All' ? '💳 All' : `${PAYMENT_EMOJIS[method]} ${method}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Description</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Category</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            <Text style={[styles.tableHeaderText, { width: 36 }]} />
          </View>

          {/* Table Rows */}
          {filteredExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={32} color="#444" />
              <Text style={styles.emptyStateText}>
                {expenses.length === 0 ? 'No expenses this month.' : 'No transactions match filters.'}
              </Text>
            </View>
          ) : (
            filteredExpenses.map((entry, idx) => (
              <View
                key={entry.id}
                style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}
              >
                <View style={{ flex: 2 }}>
                  <Text style={styles.rowDesc} numberOfLines={1}>{entry.description}</Text>
                  <Text style={styles.rowMeta}>
                    {entry.date} · {PAYMENT_EMOJIS[entry.payment_method]} {entry.payment_method}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={styles.rowCategory}>
                    {CATEGORY_EMOJIS[entry.category] || '📦'}
                  </Text>
                  <Text style={styles.rowCategoryText}>{entry.category}</Text>
                </View>
                <Text style={[styles.rowAmount, { flex: 1 }]} numberOfLines={1}>
                  {formatIDR(entry.amount)}
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(entry.id, entry.description)}
                >
                  <Ionicons name="close" size={14} color="#CF6679" />
                </TouchableOpacity>
              </View>
            ))
          )}

          {filteredExpenses.length > 0 && (
            <View style={styles.tableFooter}>
              <Text style={styles.tableFooterText}>
                {filteredExpenses.length} transaction{filteredExpenses.length !== 1 ? 's' : ''}
                {filterCategory !== 'All' || filterPayment !== 'All' ? ' (filtered)' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom spacing for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense')}
      >
        <Ionicons name="add" size={28} color="#000" />
      </TouchableOpacity>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 24,
  },
  monthText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFB74D',
  },
  chartContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  yearNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 12,
  },
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterScroll: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  filterChipActive: {
    backgroundColor: '#FFB74D',
    borderColor: '#FFB74D',
  },
  filterChipActivePayment: {
    backgroundColor: '#BB86FC',
    borderColor: '#BB86FC',
  },
  filterChipText: {
    fontSize: 11,
    color: '#aaa',
  },
  filterChipTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  filterSpacer: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    marginBottom: 4,
  },
  tableHeaderText: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  emptyState: {
    padding: 32,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  emptyStateText: {
    color: '#666',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  tableRowAlt: {
    backgroundColor: '#161616',
    borderRadius: 6,
  },
  rowDesc: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  rowMeta: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  rowCategory: {
    fontSize: 16,
  },
  rowCategoryText: {
    fontSize: 10,
    color: '#888',
    marginTop: 2,
  },
  rowAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFB74D',
    textAlign: 'right',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  tableFooter: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tableFooterText: {
    fontSize: 12,
    color: '#666',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFB74D',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#FFB74D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
