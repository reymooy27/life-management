import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import PortfolioAllocationChart from '../components/PortfolioAllocationChart';
import {
  deletePortfolioEntry,
  getPortfolioEntries,
  getPortfolioSnapshots,
  PortfolioEntryRow,
  PortfolioSnapshotRow,
  savePortfolioSnapshot,
  updatePortfolioEntryPriceByTicker,
} from '../db/database';
import {
  calculatePnL,
  calculateTotalInvestedUsd,
  calculateTotalPortfolioValueUsd,
  formatAssetCurrency,
  groupByAsset,
  groupHoldings,
} from '../features/portfolio/portfolioUtils';
import { fetchAllPrices, fetchUsdToIdrRate } from '../features/portfolio/priceService';
import { RootStackParamList } from '../types/navigation';
import { formatIDR, formatUSD } from '../utils/currency';

const SCREEN_WIDTH = Dimensions.get('window').width;

const ASSET_TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  crypto: { icon: 'logo-bitcoin', color: '#F7931A' },
  stock: { icon: 'trending-up', color: '#2196F3' },
  gold: { icon: 'diamond', color: '#FFD700' },
  custom: { icon: 'cube', color: '#9C27B0' },
};

type DisplayCurrency = 'USD' | 'IDR';

export default function PortfolioScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<PortfolioEntryRow[]>([]);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('USD');
  const [usdToIdr, setUsdToIdr] = useState(16000);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rows, snaps] = await Promise.all([
      getPortfolioEntries(),
      getPortfolioSnapshots(60),
    ]);
    setEntries(rows);
    setSnapshots(snaps);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Also fetch exchange rate
      fetchUsdToIdrRate().then(rate => setUsdToIdr(rate));
    }, [loadData])
  );

  const handleRefreshPrices = async () => {
    if (entries.length === 0) return;
    setRefreshing(true);
    try {
      // Fetch prices and exchange rate in parallel
      const [prices, rate] = await Promise.all([
        fetchAllPrices(entries),
        fetchUsdToIdrRate(),
      ]);
      setUsdToIdr(rate);

      for (const p of prices) {
        if (p.price != null) {
          await updatePortfolioEntryPriceByTicker(p.ticker, p.assetType, p.price);
        }
      }
      // Reload data
      const rows = await getPortfolioEntries();
      setEntries(rows);

      // Save snapshot for today
      const today = new Date().toISOString().split('T')[0];
      const totalUsd = calculateTotalPortfolioValueUsd(rows, rate);
      await savePortfolioSnapshot(today, totalUsd);

      // Reload snapshots
      const snaps = await getPortfolioSnapshots(60);
      setSnapshots(snaps);
    } catch (error) {
      console.error('Error refreshing prices:', error);
      Alert.alert('Error', 'Failed to fetch some prices. Please try again.');
    }
    setRefreshing(false);
  };

  const confirmDelete = (id: number, name: string) => {
    Alert.alert(
      'Delete Holding',
      `Remove "${name}" from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePortfolioEntry(id);
            loadData();
          },
        },
      ]
    );
  };

  // Calculate totals in USD first, then convert if needed
  const totalValueUsd = calculateTotalPortfolioValueUsd(entries, usdToIdr);
  const totalInvestedUsd = calculateTotalInvestedUsd(entries, usdToIdr);
  const totalPnlUsd = totalValueUsd - totalInvestedUsd;
  const totalPnlPercent = totalInvestedUsd > 0 ? (totalPnlUsd / totalInvestedUsd) * 100 : 0;

  const formatTotal = (usdAmount: number): string => {
    if (displayCurrency === 'IDR') {
      return formatIDR(usdAmount * usdToIdr);
    }
    return formatUSD(usdAmount);
  };

  const allocation = groupByAsset(entries);
  const groupedHoldings = groupHoldings(entries);

  // Chart data
  let chartData = snapshots.map(s => ({
    value: displayCurrency === 'IDR' ? s.total_value_usd * usdToIdr : s.total_value_usd,
    label: s.date.slice(5), // MM-DD
    dataPointText: '',
  }));

  // Ensure we have at least 2 points to draw a line
  if (chartData.length === 0) {
    const currentVal = displayCurrency === 'IDR' ? totalValueUsd * usdToIdr : totalValueUsd;
    chartData = [
      { value: currentVal, label: 'Start', dataPointText: '' },
      { value: currentVal, label: 'Now', dataPointText: '' },
    ];
  } else if (chartData.length === 1) {
    chartData = [
      { ...chartData[0], label: 'Prev' },
      chartData[0],
    ];
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefreshPrices}
            tintColor="#4CAF50"
            colors={['#4CAF50']}
          />
        }
      >
        {/* Currency Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, displayCurrency === 'USD' && styles.toggleBtnActive]}
            onPress={() => setDisplayCurrency('USD')}
          >
            <Text style={[styles.toggleText, displayCurrency === 'USD' && styles.toggleTextActive]}>
              USD
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, displayCurrency === 'IDR' && styles.toggleBtnActive]}
            onPress={() => setDisplayCurrency('IDR')}
          >
            <Text style={[styles.toggleText, displayCurrency === 'IDR' && styles.toggleTextActive]}>
              IDR
            </Text>
          </TouchableOpacity>
          <Text style={styles.rateText}>1 USD = {formatIDR(usdToIdr)}</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Portfolio Value</Text>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatTotal(totalValueUsd)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Invested</Text>
            <Text style={[styles.summaryValue, { color: '#aaa' }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatTotal(totalInvestedUsd)}
            </Text>
          </View>
        </View>

        {/* Portfolio Line Chart & PnL Combined */}
        <View style={styles.chartContainer}>
          {/* PnL Header inside Chart */}
          <View style={styles.pnlHeader}>
            <View style={styles.pnlRow}>
              <Ionicons
                name={totalPnlUsd >= 0 ? 'trending-up' : 'trending-down'}
                size={28}
                color={totalPnlUsd >= 0 ? '#4CAF50' : '#CF6679'}
              />
              <View style={styles.pnlTextContainer}>
                <Text style={[styles.pnlValue, { color: totalPnlUsd >= 0 ? '#4CAF50' : '#CF6679' }]}>
                  {totalPnlUsd >= 0 ? '+' : ''}{formatTotal(totalPnlUsd)}
                </Text>
                <Text style={[styles.pnlPercent, { color: totalPnlUsd >= 0 ? '#4CAF50' : '#CF6679' }]}>
                  {totalPnlUsd >= 0 ? '+' : ''}{totalPnlPercent.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
          <LineChart
            data={chartData}
            width={SCREEN_WIDTH - 80}
            height={160}
            color="#4CAF50"
            thickness={1.5}
            dataPointsColor="transparent"
            dataPointsRadius={0}
            startFillColor="rgba(76, 175, 80, 0.25)"
            endFillColor="rgba(76, 175, 80, 0.02)"
            startOpacity={0.25}
            endOpacity={0.02}
            areaChart
            curved
            hideRules
            hideYAxisText
            yAxisColor="transparent"
            xAxisColor="#333"
            xAxisLabelTextStyle={{ color: '#555', fontSize: 8 }}
            noOfSections={4}
            spacing={(SCREEN_WIDTH - 80) / Math.max(chartData.length - 1, 1)}
            adjustToWidth
            pointerConfig={{
              pointerStripColor: '#4CAF50',
              pointerStripWidth: 1,
              pointerColor: '#4CAF50',
              radius: 4,
              pointerLabelWidth: 100,
              pointerLabelHeight: 30,
              pointerLabelComponent: (items: { value: number }[]) => (
                <View style={{ backgroundColor: '#2a2a2a', borderRadius: 8, padding: 6 }}>
                  <Text style={{ color: '#4CAF50', fontSize: 11, fontWeight: '600' }}>
                    {displayCurrency === 'IDR' ? formatIDR(items[0].value) : formatUSD(items[0].value)}
                  </Text>
                </View>
              ),
            }}
          />
        </View>

        {/* Allocation Chart */}
        {Object.keys(allocation).length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.sectionTitle}>Allocation</Text>
            <PortfolioAllocationChart data={allocation} />
          </View>
        )}

        {/* Holdings List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Holdings</Text>

          {groupedHoldings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trending-up-outline" size={32} color="#444" />
              <Text style={styles.emptyStateText}>
                No investments yet. Tap + to add your first holding.
              </Text>
            </View>
          ) : (
            groupedHoldings.map((group, idx) => {
              const { pnl, pnlPercent } = calculatePnL(
                group.average_buy_price,
                group.current_price,
                group.total_quantity
              );
              const assetInfo = ASSET_TYPE_ICONS[group.asset_type] || ASSET_TYPE_ICONS.custom;
              const fmt = (v: number) => formatAssetCurrency(v, group);
              
              // We don't have individual entry ids here, but we use the composite key for the mapped key
              const groupKey = `${group.asset_type}-${group.ticker}`;
              
              return (
                <TouchableOpacity
                  key={groupKey}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('AssetTransactions', {
                    ticker: group.ticker,
                    asset_type: group.asset_type,
                    asset_name: group.asset_name,
                  })}
                >
                  <View
                    style={[styles.holdingCard, idx % 2 === 0 && styles.holdingCardAlt]}
                  >
                    <View style={styles.holdingHeader}>
                      <View style={[styles.assetIcon, { borderColor: assetInfo.color }]}>
                        <Ionicons name={assetInfo.icon} size={18} color={assetInfo.color} />
                      </View>
                      {/* Left: Total Initial Subtitle */}
                      <View style={styles.holdingNameCol}>
                        <Text style={styles.holdingName}>{group.asset_name}</Text>
                        <Text style={styles.holdingTicker}>
                          {group.ticker} · {group.asset_type.toUpperCase()}
                        </Text>
                        <Text style={styles.holdingSubtext}>
                          Invested: {fmt(group.total_invested)}
                        </Text>
                      </View>
                      
                      {/* Right: Current Value Total Colored */}
                      <View style={styles.holdingPnlCol}>
                        <Text
                          style={[styles.holdingPnl, { color: pnl >= 0 ? '#4CAF50' : '#CF6679' }]}
                        >
                          {fmt(group.total_value)}
                        </Text>
                        <Text
                          style={[
                            styles.holdingPnlPercent,
                            { color: pnl >= 0 ? '#4CAF50' : '#CF6679' },
                          ]}
                        >
                          {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.holdingDetails}>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Qty</Text>
                        <Text style={styles.detailValue}>
                          {parseFloat(group.total_quantity.toFixed(8))}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Avg Buy</Text>
                        <Text style={styles.detailValue}>{fmt(group.average_buy_price)}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Current</Text>
                        <Text style={[styles.detailValue, { color: '#4CAF50' }]}>
                          {group.current_price > 0 ? fmt(group.current_price) : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddInvestment')}
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  toggleBtnActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
  },
  toggleTextActive: {
    color: '#000',
  },
  rateText: {
    fontSize: 11,
    color: '#555',
    marginLeft: 'auto',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  pnlHeader: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pnlTextContainer: {
    gap: 2,
    flex: 1,
  },
  pnlValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pnlPercent: {
    fontSize: 15,
    fontWeight: '600',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  holdingCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  holdingCardAlt: {
    backgroundColor: '#1a1a1a',
  },
  holdingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  assetIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  holdingNameCol: {
    flex: 1,
  },
  holdingName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  holdingTicker: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  holdingPnlCol: {
    alignItems: 'flex-end',
  },
  holdingPnl: {
    fontSize: 16,
    fontWeight: '700',
  },
  holdingPnlPercent: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  holdingSubtext: {
    fontSize: 11,
    color: '#888',
    marginTop: 6,
  },
  holdingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    gap: 4,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '500',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  holdingNotes: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
