import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExpensePieChart from '../components/ExpensePieChart';
import {
  ExerciseEntryRow,
  ExpenseEntryRow,
  FoodEntryRow,
  PortfolioEntryRow,
  UserSettings,
  WaterEntryRow,
  getExerciseEntries,
  getFoodEntries,
  getMonthlyExpenses,
  getPortfolioEntries,
  getUserSettings,
  getWaterEntries,
} from '../db/database';
import { calculateMonthlyTotal, groupByCategory } from '../features/finance/financeUtils';
import { calculateDailyCalories } from '../features/food/calorieUtils';
import {
  calculateTotalInvestedUsd,
  calculateTotalPortfolioValueUsd,
} from '../features/portfolio/portfolioUtils';
import { fetchUsdToIdrRate } from '../features/portfolio/priceService';
import { RootStackParamList } from '../types/navigation';
import { formatUSD } from '../utils/currency';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface FeaturePage {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  route: Extract<keyof RootStackParamList, 'Food' | 'Exercise' | 'Money' | 'Water' | 'Portfolio'>;
  addRoute: Extract<keyof RootStackParamList, 'AddFood' | 'AddExercise' | 'AddExpense' | 'AddWater' | 'AddInvestment'>;
}

const FEATURES: FeaturePage[] = [
  {
    key: 'food',
    title: 'Food Tracker',
    subtitle: 'Log meals, search foods,\nand track your daily calories',
    icon: 'restaurant',
    accentColor: '#BB86FC',
    route: 'Food',
    addRoute: 'AddFood',
  },
  {
    key: 'exercise',
    title: 'Exercise',
    subtitle: 'Track workouts, duration,\nand calories burned',
    icon: 'fitness',
    accentColor: '#03DAC6',
    route: 'Exercise',
    addRoute: 'AddExercise',
  },
  {
    key: 'finance',
    title: 'Finance',
    subtitle: 'Monitor expenses, categories,\nand monthly spending',
    icon: 'wallet',
    accentColor: '#FFB74D',
    route: 'Money',
    addRoute: 'AddExpense',
  },
  {
    key: 'water',
    title: 'Water Tracker',
    subtitle: 'Stay hydrated,\ntrack daily water intake',
    icon: 'water',
    accentColor: '#2196F3',
    route: 'Water',
    addRoute: 'AddWater',
  },
  {
    key: 'portfolio',
    title: 'Portfolio',
    subtitle: 'Track investments, PnL,\nand portfolio allocation',
    icon: 'trending-up',
    accentColor: '#4CAF50',
    route: 'Portfolio',
    addRoute: 'AddInvestment',
  },
];

// Repeat data for infinite loop scrolling
const LOOP_MULTIPLIER = 14; // significantly reduced to avoid VirtualizedList slowness
const LOOPED_DATA = Array.from({ length: LOOP_MULTIPLIER }, (_, i) =>
  FEATURES.map(f => ({ ...f, key: `${f.key}_${i}` }))
).flat();
const MIDDLE_START_INDEX = Math.floor(LOOP_MULTIPLIER / 2) * FEATURES.length;

export default function HomeScreen({ navigation }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Height: debounce onLayout — wait for height to stabilize before committing
  const heightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [stableHeight, setStableHeight] = useState(0);

  // Simple swipe tracking (no PanResponder — avoids conflicts with FlatList scroll)
  const touchStart = useRef({ x: 0, y: 0, time: 0 });

  // Manual one-page-at-a-time snapping
  const currentPageRef = useRef(MIDDLE_START_INDEX);
  const dragStartPageRef = useRef(MIDDLE_START_INDEX);

  // Dashboard data
  const [foodEntries, setFoodEntries] = useState<FoodEntryRow[]>([]);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntryRow[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<ExpenseEntryRow[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntryRow[]>([]);
  const [portfolioEntries, setPortfolioEntries] = useState<PortfolioEntryRow[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [usdToIdrRate, setUsdToIdrRate] = useState(16000);

  // Gate viewability: ignore events for first 600ms after mount
  const mountTime = useRef(Date.now());

  const loadDashboardData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const yearMonth = today.substring(0, 7);
    const [food, exercise, expenses, water, settings, portfolio, exchangeRate] = await Promise.all([
      getFoodEntries(today),
      getExerciseEntries(today),
      getMonthlyExpenses(yearMonth),
      getWaterEntries(today),
      getUserSettings(),
      getPortfolioEntries(),
      fetchUsdToIdrRate(),
    ]);
    setFoodEntries(food);
    setExerciseEntries(exercise);
    setMonthlyExpenses(expenses);
    setWaterEntries(water);
    setPortfolioEntries(portfolio);
    setUserSettings(settings);

    // Store localized exchange rate to sync Portfolio totals accurately
    setUsdToIdrRate(exchangeRate);
    setDataLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // Ignore viewability events during initial mount/positioning
      if (Date.now() - mountTime.current < 600) return;
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index % FEATURES.length);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 80,
  }).current;

  const onListLayout = (e: LayoutChangeEvent) => {
    const h = Math.ceil(e.nativeEvent.layout.height);
    if (heightTimer.current) clearTimeout(heightTimer.current);
    heightTimer.current = setTimeout(() => {
      setStableHeight(h);
    }, 200);
  };

  const getDashboard = (featureKey: string) => {
    switch (featureKey) {
      case 'food': {
        const totalCal = calculateDailyCalories(foodEntries);
        const mealCount = foodEntries.length;
        return (
          <View style={styles.dashboardCard}>
            <View style={styles.dashRow}>
              <View style={styles.dashItem}>
                <Text style={[styles.dashValue, { color: '#BB86FC' }]}>{totalCal}</Text>
                <Text style={styles.dashLabel}>calories today</Text>
              </View>
              <View style={styles.dashDivider} />
              <View style={styles.dashItem}>
                <Text style={[styles.dashValue, { color: '#BB86FC' }]}>{mealCount}</Text>
                <Text style={styles.dashLabel}>{mealCount === 1 ? 'meal' : 'meals'} logged</Text>
              </View>
            </View>
          </View>
        );
      }
      case 'exercise': {
        const totalBurned = exerciseEntries.reduce((s, e) => s + e.calories_burned, 0);
        const totalMin = exerciseEntries.reduce((s, e) => s + e.duration_minutes, 0);
        return (
          <View style={styles.dashboardCard}>
            <View style={styles.dashRow}>
              <View style={styles.dashItem}>
                <Text style={[styles.dashValue, { color: '#03DAC6' }]}>{totalBurned}</Text>
                <Text style={styles.dashLabel}>cal burned</Text>
              </View>
              <View style={styles.dashDivider} />
              <View style={styles.dashItem}>
                <Text style={[styles.dashValue, { color: '#03DAC6' }]}>{totalMin}</Text>
                <Text style={styles.dashLabel}>min today</Text>
              </View>
            </View>
          </View>
        );
      }
      case 'finance': {
        const monthTotal = calculateMonthlyTotal(monthlyExpenses);
        const catBreakdown = groupByCategory(monthlyExpenses);
        const EMOJIS: Record<string, string> = {
          Food: '🍔', Transport: '🚗', Bills: '📄', Entertainment: '🎬', Other: '📦',
        };
        return (
          <View style={[styles.dashboardCard, { padding: 16 }]}>
            {Object.keys(catBreakdown).length > 0 && (
              <View style={{ }}>
                <ExpensePieChart
                  data={catBreakdown}
                  categoryEmojis={EMOJIS}
                  radius={60}
                  innerRadius={45}
                />
              </View>
            )}
          </View>
        );
      }
      case 'water': {
        const totalWaterIdr = waterEntries.reduce((s, e) => s + e.amount_ml, 0);
        const goal = userSettings?.water_goal_ml || 2500;
        const progress = Math.min((totalWaterIdr / goal) * 100, 100).toFixed(0);
        return (
          <View style={styles.dashboardCard}>
            <View style={styles.dashRow}>
              <View style={styles.dashItem}>
                <Text style={[styles.dashValue, { color: '#2196F3' }]}>{totalWaterIdr}</Text>
                <Text style={styles.dashLabel}>ml consumed</Text>
              </View>
              <View style={styles.dashDivider} />
              <View style={styles.dashItem}>
                <Text style={[styles.dashValue, { color: '#2196F3' }]}>{progress}%</Text>
                <Text style={styles.dashLabel}>of {goal}ml goal</Text>
              </View>
            </View>
          </View>
        );
      }
      case 'portfolio': {
        const totalInvested = calculateTotalInvestedUsd(portfolioEntries, usdToIdrRate);
        const totalValue = calculateTotalPortfolioValueUsd(portfolioEntries, usdToIdrRate);
        const totalPnl = totalValue - totalInvested;
        const pnlPercent = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
        return (
          <View style={styles.dashboardCard}>
            <View style={styles.dashRow}>
              {/* <View style={styles.dashItem}>
                <Text style={[styles.dashValue, { color: '#4CAF50' }]}>{formatUSD(totalValue)}</Text>
                <Text style={styles.dashLabel}>portfolio value</Text>
              </View> */}
              {/* <View style={styles.dashDivider} /> */}
              <View style={styles.dashItem}>
                <Text
                  style={[
                    styles.dashValue,
                    { color: totalPnl >= 0 ? '#4CAF50' : '#CF6679' },
                  ]}
                >
                  {totalPnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                </Text>
                <Text style={styles.dashLabel}>total return</Text>
              </View>
            </View>
          </View>
        );
      }
      default:
        return null;
    }
  };

  const renderItem = ({ item }: { item: FeaturePage }) => {
    const baseKey = item.key.split('_')[0];
    const itemHeight = stableHeight || 500;
    return (
      <View style={[styles.page, { height: itemHeight }]}>
        <View style={styles.pageContent}>
          <View
            style={[
              styles.emojiCircle,
              { borderColor: item.accentColor },
            ]}
          >
            <Ionicons name={item.icon} size={32} color={item.accentColor} />
          </View>

          <Text style={styles.pageTitle}>{item.title}</Text>
          <Text style={styles.pageSubtitle}>{item.subtitle}</Text>

          {/* Mini Dashboard */}
          {getDashboard(baseKey)}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.openButton, { backgroundColor: item.accentColor }]}
              onPress={() => navigation.navigate(item.route)}
            >
              <Ionicons name="arrow-forward" size={16} color="#000" />
              <Text style={styles.openButtonText}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAddRound, { backgroundColor: item.accentColor }]}
              onPress={() => navigation.navigate(item.addRoute)}
            >
              <Ionicons name="add" size={22} color="#000" />
            </TouchableOpacity>
          </View>

          {/* Dot indicators + swipe hint */}
        </View>
          <View style={styles.pageFooter}>
            <Text style={styles.hintText}>↑↓ scroll · swipe → to open</Text>
          </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Settings Button */}
      <View style={styles.settingsHeaderContainer}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={28} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Vertical Paging FlatList */}
      <View
        style={{ flex: 1 }}
        onLayout={onListLayout}
        onTouchStart={e => {
          touchStart.current = {
            x: e.nativeEvent.pageX,
            y: e.nativeEvent.pageY,
            time: Date.now(),
          };
        }}
        onTouchEnd={e => {
          const dx = e.nativeEvent.pageX - touchStart.current.x;
          const dy = e.nativeEvent.pageY - touchStart.current.y;
          const dt = Date.now() - touchStart.current.time;

          // Only trigger on fast, clearly horizontal LEFT swipes
          // Must be: quick (<400ms), horizontal (|dx| > 3*|dy|), far enough (>80px)
          if (
            dt < 400 &&
            dx < -80 &&
            Math.abs(dx) > Math.abs(dy) * 3
          ) {
            const feature = FEATURES[activeIndex];
            if (feature) {
              navigation.navigate(feature.route);
            }
          }
        }}
      >
        {stableHeight > 0 && (
          <FlatList
            ref={flatListRef}
            data={LOOPED_DATA}
            renderItem={renderItem}
            keyExtractor={item => item.key}
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={stableHeight}
            snapToAlignment="start"
            disableIntervalMomentum={true}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={MIDDLE_START_INDEX}
            getItemLayout={(_, index) => ({
              length: stableHeight,
              offset: stableHeight * index,
              index,
            })}
            extraData={dataLoaded}
            windowSize={3}
            maxToRenderPerBatch={3}
            initialNumToRender={3}
          />
        )}
      </View>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  settingsHeaderContainer: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    marginTop: 4,
  },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    overflow: 'hidden',
  },
  pageContent: {
    alignItems: 'center',
    width: '100%',
  },
  emojiCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  dashboardCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  dashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashItem: {
    flex: 1,
    alignItems: 'center',
  },
  dashValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dashLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dashDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#333',
  },
  dashBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  dashBreakdownItem: {
    alignItems: 'center',
    gap: 2,
  },
  dashBreakdownEmoji: {
    fontSize: 16,
  },
  dashBreakdownText: {
    fontSize: 10,
    color: '#FFB74D',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
  },
  openButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  quickAddRound: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 11,
    color: '#555',
    letterSpacing: 0.5,
  },
});
