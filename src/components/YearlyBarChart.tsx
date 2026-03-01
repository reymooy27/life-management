import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatIDR } from '../utils/currency';

interface YearlyBarChartProps {
  /** Map of month number (1-12) to total amount */
  monthlyData: Record<number, number>;
  accentColor?: string;
  year: number;
}

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export default function YearlyBarChart({
  monthlyData,
  accentColor = '#FFB74D',
  year,
}: YearlyBarChartProps) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const values = Object.values(monthlyData);
  const maxValue = values.length > 0 ? Math.max(...values, 1) : 1;

  return (
    <View style={styles.container}>
      {/* Bars */}
      <View style={styles.barsRow}>
        {Array.from({ length: 12 }, (_, i) => {
          const month = i + 1;
          const amount = monthlyData[month] || 0;
          const barHeight = maxValue > 0 ? (amount / maxValue) * 120 : 0;
          const isCurrentMonth = year === currentYear && month === currentMonth;

          return (
            <View key={month} style={styles.barColumn}>
              <Text style={styles.barAmount} numberOfLines={1}>
                {amount > 0 ? formatIDR(amount).replace('Rp ', '') : ''}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 2),
                      backgroundColor: isCurrentMonth ? '#fff' : accentColor,
                      opacity: amount > 0 ? (isCurrentMonth ? 1 : 0.7) : 0.15,
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.monthLabel,
                  isCurrentMonth && { color: '#fff', fontWeight: 'bold' },
                ]}
              >
                {MONTH_LABELS[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    gap: 2,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  barAmount: {
    fontSize: 7,
    color: '#888',
    marginBottom: 4,
    textAlign: 'center',
  },
  barTrack: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
  },
  monthLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 6,
  },
});
