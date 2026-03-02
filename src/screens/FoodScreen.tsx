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
import { deleteFoodEntry, FoodEntryRow, getFoodEntries } from '../db/database';
import { calculateDailyCalories } from '../features/food/calorieUtils';
import { RootStackParamList } from '../types/navigation';

export default function FoodScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [entries, setEntries] = useState<FoodEntryRow[]>([]);

  const loadEntries = useCallback(async () => {
    const rows = await getFoodEntries(selectedDate);
    setEntries(rows);
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

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">

        {/* Daily Summary */}
        <View style={styles.summaryCard}>
          <Ionicons name="flame-outline" size={24} color="#BB86FC" />
          <Text style={styles.summaryValue}>{dailyTotal}</Text>
          <Text style={styles.summaryUnit}>cal today</Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
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
                  <Ionicons name="restaurant" size={18} color="#BB86FC" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryName}>{entry.name}</Text>
                  <Text style={styles.entryTime}>
                    {entry.time} · {entry.calories} cal
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
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#BB86FC',
  },
  summaryUnit: {
    fontSize: 14,
    color: '#888',
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
  },
  entryTime: {
    fontSize: 14,
    color: '#888',
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
