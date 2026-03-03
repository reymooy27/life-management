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
    deleteExerciseEntry,
    ExerciseEntryRow,
    getExerciseEntries,
} from '../db/database';
import { RootStackParamList } from '../types/navigation';

export default function ExerciseScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const TODAY = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(TODAY);
  const [currentMonth, setCurrentMonth] = useState<string>(TODAY.substring(0, 7));
  const [entries, setEntries] = useState<ExerciseEntryRow[]>([]);

  const loadEntries = useCallback(async () => {
    const rows = await getExerciseEntries(selectedDate);
    setEntries(rows);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleDelete = async (id: number) => {
    await deleteExerciseEntry(id);
    await loadEntries();
  };

  const totalBurned = entries.reduce((s, e) => s + e.calories_burned, 0);
  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">

        {/* Daily Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="flame-outline" size={20} color="#03DAC6" />
            <Text style={styles.summaryValue}>{totalBurned}</Text>
            <Text style={styles.summaryUnit}>cal</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="timer-outline" size={20} color="#03DAC6" />
            <Text style={styles.summaryValue}>{totalMinutes}</Text>
            <Text style={styles.summaryUnit}>min</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            maxDate={TODAY}
            onMonthChange={(month: DateData) => setCurrentMonth(month.dateString.substring(0, 7))}
            renderArrow={(direction: string) => {
              if (direction === 'left') return <Ionicons name="chevron-back" size={24} color="#03DAC6" />;
              if (direction === 'right' && currentMonth < TODAY.substring(0, 7)) {
                return <Ionicons name="chevron-forward" size={24} color="#03DAC6" />;
              }
              return <View style={{ width: 24 }} />;
            }}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#03DAC6' },
            }}
            theme={{
              backgroundColor: '#1e1e1e',
              calendarBackground: '#1e1e1e',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#03DAC6',
              selectedDayTextColor: '#000',
              todayTextColor: '#03DAC6',
              dayTextColor: '#d9e1e8',
              textDisabledColor: '#2d4150',
              monthTextColor: '#fff',
              arrowColor: '#03DAC6',
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
            Exercises for{' '}
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
          </Text>

          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={32} color="#444" />
              <Text style={styles.emptyStateText}>
                No exercises logged yet.
              </Text>
            </View>
          ) : (
            entries.map(entry => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryIcon}>
                  <Ionicons name="fitness" size={18} color="#03DAC6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryName}>{entry.name}</Text>
                  <Text style={styles.entryMeta}>
                    {entry.time} · {entry.duration_minutes} min ·{' '}
                    {entry.calories_burned} cal
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
        onPress={() => navigation.navigate('AddExercise')}
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
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#03DAC6',
  },
  summaryUnit: {
    fontSize: 13,
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
  entryMeta: {
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
    backgroundColor: '#03DAC6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#03DAC6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
