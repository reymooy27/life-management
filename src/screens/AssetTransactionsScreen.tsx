import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  deletePortfolioEntry,
  getTransactionHistoryForAsset,
  PortfolioEntryRow,
} from '../db/database';
import { calculatePnL, formatAssetCurrency } from '../features/portfolio/portfolioUtils';
import { RootStackParamList } from '../types/navigation';

type AssetTransactionsRouteProp = RouteProp<RootStackParamList, 'AssetTransactions'>;

export default function AssetTransactionsScreen() {
  const route = useRoute<AssetTransactionsRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { ticker, asset_type, asset_name } = route.params;

  const [transactions, setTransactions] = useState<PortfolioEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const history = await getTransactionHistoryForAsset(ticker, asset_type);
    setTransactions(history);
    setLoading(false);
  }, [ticker, asset_type]);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: asset_name });
      loadData();
    }, [loadData, asset_name, navigation])
  );

  const confirmDelete = (id: number, date: string) => {
    Alert.alert(
      'Delete Transaction',
      `Remove this transaction from ${date}?`,
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

  const renderItem = ({ item }: { item: PortfolioEntryRow }) => {
    const isIdr = asset_type === 'stock' && ticker.toUpperCase().endsWith('.JK');

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{item.date_added}</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => confirmDelete(item.id, item.date_added)}
          >
            <Ionicons name="trash-outline" size={16} color="#CF6679" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.col}>
            <Text style={styles.label}>Quantity</Text>
            <Text style={styles.value}>{item.quantity}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Buy Price</Text>
            <Text style={styles.value}>{formatAssetCurrency(item.buy_price, item)}</Text>
          </View>
          <View style={[styles.col, { alignItems: 'flex-end' }]}>
            <Text style={styles.label}>Total Cost</Text>
            <Text style={styles.value}>
              {formatAssetCurrency(item.quantity * item.buy_price, item)}
            </Text>
          </View>
        </View>

        {item.notes ? (
          <Text style={styles.notesText}>{item.notes}</Text>
        ) : null}
      </View>
    );
  };

  const isIdrGlobal = asset_type === 'stock' && ticker.toUpperCase().endsWith('.JK');

  // Calculate summary metrics based on loaded transactions
  let totalQuantity = 0;
  let totalCost = 0;
  let currentPrice = 0; // Grabbed from the latest entry if exists

  transactions.forEach((tx) => {
    totalQuantity += tx.quantity;
    totalCost += (tx.quantity * tx.buy_price);
    if (currentPrice === 0 && tx.current_price > 0) {
      currentPrice = tx.current_price;
    }
  });

  const avgBuyPrice = totalQuantity > 0 ? (totalCost / totalQuantity) : 0;
  const currentValue = currentPrice * totalQuantity;
  const { pnl, pnlPercent } = calculatePnL(avgBuyPrice, currentPrice, totalQuantity);

  // Helper formatter for summary
  const fmtSumm = (v: number) => {
    return formatAssetCurrency(v, { asset_type, ticker });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>{asset_name}</Text>
            <Text style={styles.headerSubtitle}>
              {ticker} · {asset_type.toUpperCase()}
            </Text>
          </View>
        </View>

        {transactions.length > 0 && (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Total Invested</Text>
                <Text style={styles.summaryValue}>{fmtSumm(totalCost)}</Text>
              </View>
              <View style={[styles.summaryCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.summaryLabel}>Current Value</Text>
                <Text style={[styles.summaryValue, { color: pnl >= 0 ? '#4CAF50' : '#CF6679' }]}>
                  {fmtSumm(currentValue)}
                </Text>
              </View>
            </View>

            <View style={[styles.summaryRow, { marginTop: 12 }]}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Average Buy</Text>
                <Text style={styles.summaryValue}>{fmtSumm(avgBuyPrice)}</Text>
              </View>
              <View style={[styles.summaryCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.summaryLabel}>Current Price</Text>
                <Text style={styles.summaryValue}>
                  {currentPrice > 0 ? fmtSumm(currentPrice) : '—'}
                </Text>
              </View>
            </View>

            <View style={[styles.summaryRow, { marginTop: 12 }]}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>Total Quantity</Text>
                <Text style={styles.summaryValue}>{parseFloat(totalQuantity.toFixed(8))}</Text>
              </View>
              <View style={[styles.summaryCol, { alignItems: 'flex-end' }]}>
                <Text style={styles.summaryLabel}>Total PnL</Text>
                <View style={{ alignItems: 'flex-end' }}>
                   <Text style={[styles.summaryPnl, { color: pnl >= 0 ? '#4CAF50' : '#CF6679' }]}>
                     {pnl >= 0 ? '+' : ''}{fmtSumm(pnl)}
                   </Text>
                   <Text style={[styles.summaryPnlPercent, { color: pnl >= 0 ? '#4CAF50' : '#CF6679' }]}>
                     {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                   </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No transactions found.</Text>
            </View>
          ) : null
        }
      />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 4,
  },
  summaryContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#aaa',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  summaryPnl: {
    fontSize: 15,
    fontWeight: '700',
  },
  summaryPnlPercent: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#ccc',
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  notesText: {
    marginTop: 12,
    fontSize: 12,
    color: '#aaa',
    fontStyle: 'italic',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
});
