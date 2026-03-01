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
import {
  ExerciseEntryRow,
  ExpenseEntryRow,
  FoodEntryRow,
  getExerciseEntries,
  getFoodEntries,
  getMonthlyExpenses,
} from '../db/database';
import { calculateMonthlyTotal } from '../features/finance/financeUtils';
import { calculateDailyCalories } from '../features/food/calorieUtils';
import { RootStackParamList } from '../types/navigation';
import { formatIDR } from '../utils/currency';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface FeaturePage {
  key: string;
  title: string;
  subtitle: string;
  emoji: string;
  accentColor: string;
  route: keyof RootStackParamList;
}

const FEATURES: FeaturePage[] = [
  {
    key: 'food',
    title: 'Food Tracker',
    subtitle: 'Log meals, search foods,\nand track your daily calories',
    emoji: '🥗',
    accentColor: '#BB86FC',
    route: 'Food',
  },
  {
    key: 'exercise',
    title: 'Exercise',
    subtitle: 'Track workouts, duration,\nand calories burned',
    emoji: '🏃',
    accentColor: '#03DAC6',
    route: 'Exercise',
  },
  {
    key: 'finance',
    title: 'Finance',
    subtitle: 'Monitor expenses, categories,\nand monthly spending',
    emoji: '💰',
    accentColor: '#FFB74D',
    route: 'Money',
  },
];

// Repeat data for infinite loop scrolling
const LOOP_MULTIPLIER = 100;
const LOOPED_DATA = Array.from({ length: LOOP_MULTIPLIER }, (_, i) =>
  FEATURES.map(f => ({ ...f, key: `${f.key}_${i}` }))
).flat();
const MIDDLE_START_INDEX = Math.floor(LOOP_MULTIPLIER / 2) * FEATURES.length;

export default function HomeScreen({ navigation }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Simple swipe tracking (no PanResponder — avoids conflicts with FlatList scroll)
  const touchStart = useRef({ x: 0, y: 0, time: 0 });

  // Dashboard data
  const [foodEntries, setFoodEntries] = useState<FoodEntryRow[]>([]);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntryRow[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<ExpenseEntryRow[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const loadDashboardData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const yearMonth = today.substring(0, 7);
    const [food, exercise, expenses] = await Promise.all([
      getFoodEntries(today),
      getExerciseEntries(today),
      getMonthlyExpenses(yearMonth),
    ]);
    setFoodEntries(food);
    setExerciseEntries(exercise);
    setMonthlyExpenses(expenses);
    setDataLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index % FEATURES.length);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const onListLayout = (e: LayoutChangeEvent) => {
    setListHeight(e.nativeEvent.layout.height);
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
        const txCount = monthlyExpenses.length;
        return (
          <View style={styles.dashboardCard}>
            <View style={styles.dashRow}>
              <View style={styles.dashItem}>
                <Text style={[styles.dashValue, { color: '#FFB74D' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatIDR(monthTotal)}
                </Text>
                <Text style={styles.dashLabel}>this month</Text>
              </View>
              <View style={styles.dashDivider} />
              <View style={styles.dashItem}>
                <Text style={[styles.dashValue, { color: '#FFB74D' }]}>{txCount}</Text>
                <Text style={styles.dashLabel}>transactions</Text>
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
    const itemHeight = listHeight || 500;
    return (
      <View style={[styles.page, { height: itemHeight }]}>
        <View style={styles.pageContent}>
          <View
            style={[
              styles.emojiCircle,
              { borderColor: item.accentColor },
            ]}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
          </View>

          <Text style={styles.pageTitle}>{item.title}</Text>
          <Text style={styles.pageSubtitle}>{item.subtitle}</Text>

          {/* Mini Dashboard */}
          {getDashboard(baseKey)}

          <TouchableOpacity
            style={[styles.openButton, { backgroundColor: item.accentColor }]}
            onPress={() => navigation.navigate(item.route)}
          >
            <Text style={styles.openButtonText}>Open →</Text>
          </TouchableOpacity>
        </View>

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <Text style={styles.swipeHintText}>↑↓ scroll  ←  swipe to open  →  swipe back</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <Text style={styles.title}>LifeManager</Text>
        <Text style={styles.subtitle}>Master your day, one step at a time.</Text>
      </View>

      {/* Dot Indicators */}
      <View style={styles.dots}>
        {FEATURES.map((f, i) => (
          <View
            key={f.key}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === activeIndex ? FEATURES[activeIndex].accentColor : '#444',
                width: i === activeIndex ? 24 : 8,
              },
            ]}
          />
        ))}
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
        {listHeight > 0 && (
          <FlatList
            ref={flatListRef}
            data={LOOPED_DATA}
            renderItem={renderItem}
            keyExtractor={item => item.key}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            snapToAlignment="start"
            snapToInterval={listHeight}
            decelerationRate="fast"
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            initialScrollIndex={MIDDLE_START_INDEX}
            getItemLayout={(_, index) => ({
              length: listHeight,
              offset: listHeight * index,
              index,
            })}
            extraData={dataLoaded}
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
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  page: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  pageContent: {
    alignItems: 'center',
    width: '100%',
  },
  emojiCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  emoji: {
    fontSize: 40,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  dashboardCard: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
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
    fontSize: 22,
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
  openButton: {
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  openButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
  swipeHint: {
    position: 'absolute',
    bottom: 20,
  },
  swipeHintText: {
    fontSize: 11,
    color: '#555',
    letterSpacing: 1,
  },
});
