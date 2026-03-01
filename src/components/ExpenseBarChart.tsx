import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatIDR } from '../utils/currency';

interface BarChartProps {
  data: Record<string, number>;
  accentColor?: string;
  categoryEmojis?: Record<string, string>;
}

export default function ExpenseBarChart({
  data,
  accentColor = '#FFB74D',
  categoryEmojis = {},
}: BarChartProps) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const maxValue = Math.max(...entries.map(([, v]) => v));

  return (
    <View style={styles.container}>
      {entries.map(([category, amount]) => {
        const barWidth = maxValue > 0 ? (amount / maxValue) * 100 : 0;
        return (
          <View key={category} style={styles.row}>
            <View style={styles.labelContainer}>
              <Text style={styles.emoji}>
                {categoryEmojis[category] || '📦'}
              </Text>
              <Text style={styles.label} numberOfLines={1}>
                {category}
              </Text>
            </View>
            <View style={styles.barContainer}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${Math.max(barWidth, 2)}%`,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.amount, { color: accentColor }]}>
              {formatIDR(amount)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
    gap: 6,
  },
  emoji: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    color: '#ccc',
    flex: 1,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 10,
    opacity: 0.85,
  },
  amount: {
    fontSize: 12,
    fontWeight: '600',
    width: 85,
    textAlign: 'right',
  },
});
