import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import {
  deleteFoodEntry,
  ExerciseEntryRow,
  FoodEntryRow,
  getExerciseEntries,
  getFoodEntries,
  getUserSettings,
  UserSettings,
} from '../db/database';
import { calculateDailyCalories, calculateDailyMacros, calculateNetCalories } from '../features/food/calorieUtils';
import { calculateAge, calculateBMR, calculateTDEE, validateMeasurement } from '../features/settings/settingsUtils';
import { RootStackParamList } from '../types/navigation';

export default function FoodScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const TODAY = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(TODAY);
  const [currentMonth, setCurrentMonth] = useState<string>(TODAY.substring(0, 7));
  const [entries, setEntries] = useState<FoodEntryRow[]>([]);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntryRow[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const loadEntries = useCallback(async () => {
    const [foodRows, exerciseRows, userSet] = await Promise.all([
      getFoodEntries(selectedDate),
      getExerciseEntries(selectedDate),
      getUserSettings(),
    ]);
    setEntries(foodRows);
    setExerciseEntries(exerciseRows);
    setSettings(userSet);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleDelete = async (id: number) => {
    await deleteFoodEntry(id);
    await loadEntries();
  };

  const dailyTotal = calculateDailyCalories(entries);
  const dailyMacros = calculateDailyMacros(entries);
  const burnedTotal = exerciseEntries.reduce((sum, e) => sum + e.calories_burned, 0);

  // Goal calculation
  let goal = 2000; // Default goal
  if (settings) {
    const displayAge = settings.birthdate ? calculateAge(settings.birthdate) : 30;
    const parsedWeight = validateMeasurement(settings.weight_kg?.toString() || '') || 70;
    const parsedHeight = validateMeasurement(settings.height_cm?.toString() || '') || 170;
    const gender = (settings.gender as 'Male' | 'Female') || 'Male';
    const bmr = calculateBMR(parsedWeight, parsedHeight, displayAge, gender);
    if (bmr > 0) {
      goal = calculateTDEE(bmr, settings.activity_level || 'sedentary');
    }
  }

  const remaining = goal - dailyTotal + burnedTotal;
  const isOverGoal = remaining < 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Breakfast': return 'sunny';
      case 'Lunch': return 'fast-food';
      case 'Dinner': return 'restaurant';
      default: return 'cafe';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">

        {/* Dashboard Dashboard */}
        <View style={styles.dashboardCard}>
          <View style={styles.dashRow}>
            <View style={styles.dashItem}>
              <Text style={styles.dashValue}>{goal}</Text>
              <Text style={styles.dashLabel}>Goal</Text>
            </View>
            <View style={styles.dashDivider} />
            <View style={styles.dashItem}>
              <Text style={[styles.dashValue, { color: '#BB86FC' }]}>{dailyTotal}</Text>
              <Text style={styles.dashLabel}>Consumed</Text>
            </View>
            <View style={styles.dashDivider} />
            <View style={styles.dashItem}>
              <Text style={[styles.dashValue, { color: '#03DAC6' }]}>{burnedTotal}</Text>
              <Text style={styles.dashLabel}>Burned</Text>
            </View>
            <View style={styles.dashDivider} />
            <View style={styles.dashItem}>
              <Text style={[styles.dashValue, { color: isOverGoal ? '#CF6679' : '#fff' }]}>
                {Math.abs(remaining)}
              </Text>
              <Text style={styles.dashLabel}>{isOverGoal ? 'Over' : 'Left'}</Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{dailyMacros.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{dailyMacros.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroItem}>
              <Text style={styles.macroValue}>{dailyMacros.fats}g</Text>
              <Text style={styles.macroLabel}>Fats</Text>
            </View>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            maxDate={TODAY}
            onMonthChange={(month: DateData) => setCurrentMonth(month.dateString.substring(0, 7))}
            renderArrow={(direction: string) => {
              if (direction === 'left') return <Ionicons name="chevron-back" size={24} color="#BB86FC" />;
              if (direction === 'right' && currentMonth < TODAY.substring(0, 7)) {
                return <Ionicons name="chevron-forward" size={24} color="#BB86FC" />;
              }
              return <View style={{ width: 24 }} />;
            }}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#BB86FC' },
            }}
            theme={{
              backgroundColor: '#1e1e1e',
              calendarBackground: '#1e1e1e',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#BB86FC',
              selectedDayTextColor: '#000',
              todayTextColor: '#BB86FC',
              dayTextColor: '#d9e1e8',
              textDisabledColor: '#2d4150',
              monthTextColor: '#fff',
              arrowColor: '#BB86FC',
              textMonthFontWeight: 'bold',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>

        {/* Entry List */}
        <View style={styles.entriesContainer}>
          <Text style={styles.sectionTitle}>
            Meals for{' '}
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
          </Text>

          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="restaurant-outline" size={32} color="#444" />
              <Text style={styles.emptyStateText}>
                No meals logged yet.
              </Text>
            </View>
          ) : (
            entries.map(entry => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryIcon}>
                  <Ionicons name={getCategoryIcon(entry.category)} size={18} color="#BB86FC" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.entryName}>{entry.name}</Text>
                    <Text style={styles.entryCategoryBadge}>{entry.category}</Text>
                  </View>
                  <Text style={styles.entryTime}>
                    {entry.time} · {entry.calories} cal
                  </Text>
                  <Text style={styles.entryMacros}>
                    P: {entry.protein}g · C: {entry.carbs}g · F: {entry.fats}g
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(entry.id)}
                >
                  <Ionicons name="close" size={16} color="#CF6679" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddFood')}
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
  dashboardCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  dashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dashItem: {
    alignItems: 'center',
    flex: 1,
  },
  dashValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  dashLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  dashDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e0e0e0',
  },
  macroLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  calendarContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  entriesContainer: {
    padding: 24,
    marginBottom: 100,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 16,
  },
  emptyState: {
    padding: 32,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  emptyStateText: {
    color: '#666',
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  entryName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 2,
  },
  entryCategoryBadge: {
    fontSize: 10,
    color: '#BB86FC',
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(187, 134, 252, 0.2)',
  },
  entryTime: {
    fontSize: 13,
    color: '#888',
  },
  entryMacros: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#BB86FC',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#BB86FC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
