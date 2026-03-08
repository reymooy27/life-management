import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  UserSettings,
  WaterEntryRow,
  WaterHistoryRow,
  deleteWaterEntry,
  getUserSettings,
  getWaterEntries,
  getWaterHistory,
} from '../db/database';
import { RootStackParamList } from '../types/navigation';

const getWeekDays = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - dayOfWeek);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    // adjust for local timezone offset so ISOString gets the correct local date
    const offset = d.getTimezoneOffset() * 60000;
    const localDate = new Date(d.getTime() - offset);
    week.push(localDate.toISOString().split('T')[0]);
  }
  return week;
};

export default function WaterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [entries, setEntries] = useState<WaterEntryRow[]>([]);
  const [history, setHistory] = useState<WaterHistoryRow[]>([]);
  const [goal, setGoal] = useState(2500);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await getWaterEntries(today);
      const histData = await getWaterHistory(7);
      const settings = await getUserSettings();
      setEntries(data);
      setHistory(histData.reverse()); // Show oldest to newest left to right
      if (settings?.water_goal_ml) {
        setGoal(settings.water_goal_ml);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalWater = entries.reduce((sum, item) => sum + item.amount_ml, 0);
  const fillPercentage = Math.min((totalWater / goal) * 100, 100);

  const handleDelete = (id: number, name: string) => {
    Alert.alert('Delete Entry', `Remove ${name} from today's log?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWaterEntry(id);
          loadData();
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: WaterEntryRow }) => (
    <View style={styles.entryRow}>
      <View style={styles.entryIcon}>
        <Ionicons name="water-outline" size={20} color="#2196F3" />
      </View>
      <View style={styles.entryInfo}>
        <Text style={styles.entryName}>{item.name}</Text>
        <Text style={styles.entryTime}>{item.time}</Text>
      </View>
      <Text style={styles.entryAmount}>+{item.amount_ml} ml</Text>
      <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color="#CF6679" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        {/* The "Glass" */}
        <View style={styles.glassOutline}>
          <View style={[styles.glassFill, { height: `${fillPercentage}%` }]} />
          <View style={styles.progressTextContainer}>
            <Text style={styles.progressAmount}>{totalWater}</Text>
            <Text style={styles.progressGoal}>/ {goal} ml</Text>
          </View>
        </View>
        <Text style={styles.percentageText}>{fillPercentage.toFixed(0)}% of daily goal</Text>
      </View>

      {/* History Ribbon */}
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>This Week</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
          {getWeekDays().map((dateStr, idx) => {
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const dayData = history.find(h => h.date === dateStr);
            const totalMl = dayData ? dayData.total_ml : 0;
            const pct = (totalMl / goal) * 100;
            const hitGoal = pct >= 90;

            const [y, m, d] = dateStr.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

            return (
              <View key={idx} style={styles.streakDayContainer}>
                {hitGoal ? (
                  <View style={styles.streakFireCircle}>
                    <Text style={styles.fireIcon}>🔥</Text>
                  </View>
                ) : (
                  <View style={[styles.streakCircle, isToday && styles.streakCircleToday]}>
                    {totalMl > 0 ? (
                      <Ionicons name="water" size={18} color={isToday ? "#2196F3" : "#444"} />
                    ) : (
                      <View style={{}} >
                        <Text style={{ color: isToday ? '#2196F3' : '#666' }}>
                          {parseInt(d)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
                <Text style={[styles.streakDayText, isToday && styles.streakDayTextToday]}>
                  {isToday ? 'Today' : dayName}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Today's Logs</Text>
        <Text style={styles.entryCount}>{entries.length} entries</Text>
      </View>

      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="water" size={48} color="#333" />
          <Text style={styles.emptyText}>No water logged yet today.</Text>
          <Text style={styles.emptySubText}>Stay hydrated and track your intake.</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddWater')}
      >
        <Ionicons name="add" size={28} color="#fff" />
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
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#1a1a1a',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  historyContainer: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  historyScroll: {
    paddingHorizontal: 20,
    gap: 16,
  },
  streakDayContainer: {
    alignItems: 'center',
    gap: 8,
  },
  streakCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCircleToday: {
    borderColor: '#2196F3',
    backgroundColor: '#162b3d',
  },
  streakFireCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderWidth: 2,
    borderColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fireIcon: {
    fontSize: 22,
  },
  streakDayText: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  streakDayTextToday: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  glassOutline: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 6,
    borderColor: '#2196F3',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
    position: 'relative',
  },
  glassFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(33, 150, 243, 0.3)', // translucent blue
  },
  progressTextContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  progressAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressGoal: {
    fontSize: 16,
    color: '#aaa',
    marginTop: -4,
  },
  percentageText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  entryCount: {
    fontSize: 14,
    color: '#aaa',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  entryTime: {
    fontSize: 13,
    color: '#888',
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2196F3',
    marginRight: 12,
  },
  deleteBtn: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    marginBottom: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
