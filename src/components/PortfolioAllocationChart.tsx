import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { formatUSD } from '../utils/currency';

interface AllocationData {
  [assetName: string]: number;
}

interface Props {
  data: AllocationData;
  totalFormatted: string;
}

const COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0',
  '#00BCD4', '#FF5722', '#8BC34A', '#3F51B5', '#FFC107',
  '#795548', '#607D8B', '#F44336', '#009688', '#CDDC39',
];

export default function PortfolioAllocationChart({ data, totalFormatted }: Props) {
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

  // Center label: dynamic total string
  const centerLabel = () => (
    <View style={styles.centerLabel}>
      <Text style={styles.centerLabelTitle}>Total</Text>
      <Text style={styles.centerLabelValue} numberOfLines={1} adjustsFontSizeToFit>
        {totalFormatted}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Pie Chart */}
      <View style={styles.chartRow}>
        <PieChart
          data={pieData}
          donut
          radius={80}
          innerRadius={50}
          innerCircleColor="#1e1e1e"
          centerLabelComponent={centerLabel}
          textBackgroundRadius={12}
          showText
          textSize={10}
          focusOnPress
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
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 2,
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
