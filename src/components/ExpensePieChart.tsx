import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { formatIDR } from '../utils/currency';

interface AllocationData {
  [categoryName: string]: number;
}

interface Props {
  data: AllocationData;
  radius?: number;
  innerRadius?: number;
}

const COLORS = [
   '#FF9800', '#2196F3', '#4CAF50','#E91E63', '#9C27B0',
  '#00BCD4', '#FF5722', '#8BC34A', '#3F51B5', '#FFC107',
];

export default function ExpensePieChart({
  data,
  radius = 80,
  innerRadius = 50
}: Props) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total <= 0) return null;

  const pieData = entries.map(([name, value], idx) => ({
    value,
    color: COLORS[idx % COLORS.length],
    text: `${((value / total) * 100).toFixed(0)}%`,
    textColor: '#fff',
    textSize: 11,
    focused: idx === 0,
    name,
  }));

  // Center label: total value
  const centerLabel = () => (
    <View style={[styles.centerLabel, { width: radius }]}>
      <Text style={styles.centerLabelTitle}>Total</Text>
      <Text style={styles.centerLabelValue} numberOfLines={1} adjustsFontSizeToFit>
        {formatIDR(total)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Pie Chart Row */}
      <View style={styles.chartRow}>
        <PieChart
          data={pieData}
          donut
          radius={radius}
          innerRadius={innerRadius}
          innerCircleColor="#1e1e1e"
          centerLabelComponent={centerLabel}
          textBackgroundRadius={12}
          showText
          textSize={10}
        />

        {/* Legend */}
        <View style={styles.legend}>
          {entries.map(([name, value], idx) => {
            const percent = ((value / total) * 100).toFixed(1);
            return (
              <View key={name} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS[idx % COLORS.length] }]} />
                <Text style={styles.legendName} numberOfLines={1}>
                  {name}
                </Text>
                <Text style={[styles.legendPercent, { color: COLORS[idx % COLORS.length] }]}>
                  {percent}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelTitle: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  centerLabelValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFB74D',
    marginTop: 2,
    width: '100%',
    textAlign: 'center',
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    flex: 1,
    fontSize: 12,
    color: '#ccc',
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
});
