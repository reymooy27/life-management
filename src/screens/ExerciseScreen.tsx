import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    addExerciseEntry,
    deleteExerciseEntry,
    ExerciseEntryRow,
    getExerciseEntries,
} from '../db/database';
import { validateCalorieInput } from '../features/food/calorieUtils';

export default function ExerciseScreen() {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [entries, setEntries] = useState<ExerciseEntryRow[]>([]);
  const [exerciseName, setExerciseName] = useState('');
  const [duration, setDuration] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [error, setError] = useState('');

  const loadEntries = useCallback(async () => {
    const rows = await getExerciseEntries(selectedDate);
    setEntries(rows);
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleAdd = async () => {
    if (!exerciseName.trim()) {
      setError('Enter an exercise name');
      return;
    }
    const dur = validateCalorieInput(duration);
    if (dur === null || dur <= 0) {
      setError('Enter a valid duration in minutes');
      return;
    }
    const cal = validateCalorieInput(caloriesBurned);
    if (cal === null) {
      setError('Enter a valid calorie count');
      return;
    }
    setError('');
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    await addExerciseEntry(exerciseName.trim(), dur, cal, selectedDate, time);
    setExerciseName('');
    setDuration('');
    setCaloriesBurned('');
    await loadEntries();
  };

  const handleDelete = async (id: number) => {
    await deleteExerciseEntry(id);
    await loadEntries();
  };

  const totalBurned = entries.reduce((s, e) => s + e.calories_burned, 0);
  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Header with Back */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exercise Log</Text>
        </View>

        {/* Daily Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Burned</Text>
            <Text style={styles.summaryValue}>{totalBurned}</Text>
            <Text style={styles.summaryUnit}>cal</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{totalMinutes}</Text>
            <Text style={styles.summaryUnit}>min</Text>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#03DAC6' },
            }}
            theme={{
              backgroundColor: '#1e1e1e',
              calendarBackground: '#1e1e1e',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#03DAC6',
              selectedDayTextColor: '#000000',
              todayTextColor: '#03DAC6',
              dayTextColor: '#d9e1e8',
              textDisabledColor: '#2d4150',
              monthTextColor: '#ffffff',
              arrowColor: '#03DAC6',
              textMonthFontWeight: 'bold',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
            }}
          />
        </View>

        {/* Input Section */}
        <View style={styles.entriesContainer}>
          <Text style={styles.sectionTitle}>
            Exercises for{' '}
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString()}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Exercise name (e.g., Running)"
            placeholderTextColor="#666"
            value={exerciseName}
            onChangeText={text => {
              setExerciseName(text);
              setError('');
            }}
          />
          <View style={styles.rowInputs}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Min"
              placeholderTextColor="#666"
              value={duration}
              onChangeText={text => {
                setDuration(text);
                setError('');
              }}
              keyboardType="numeric"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Calories burned"
              placeholderTextColor="#666"
              value={caloriesBurned}
              onChangeText={text => {
                setCaloriesBurned(text);
                setError('');
              }}
              keyboardType="numeric"
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Entry List */}
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No exercises logged yet.
              </Text>
            </View>
          ) : (
            entries.map(entry => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryIcon}>
                  <Text>🏃</Text>
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
                  <Text style={styles.deleteButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  backArrow: {
    fontSize: 20,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
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
    fontSize: 36,
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
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 15,
    marginBottom: 8,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#03DAC6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#000',
  },
  errorText: {
    color: '#CF6679',
    fontSize: 13,
    marginBottom: 8,
    marginLeft: 4,
  },
  emptyState: {
    padding: 24,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333',
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
    color: '#ffffff',
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
  deleteButtonText: {
    color: '#CF6679',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
