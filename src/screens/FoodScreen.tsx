import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock data type
interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  time: string;
}

export default function FoodScreen() {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [foodEntries, setFoodEntries] = useState<Record<string, FoodEntry[]>>({});
  const [newFoodName, setNewFoodName] = useState('');

  const currentEntries = foodEntries[selectedDate] || [];

  const addFood = () => {
    if (!newFoodName.trim()) return;

    const newEntry: FoodEntry = {
      id: Math.random().toString(),
      name: newFoodName,
      calories: 0, // Placeholder
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setFoodEntries(prev => ({
      ...prev,
      [selectedDate]: [...(prev[selectedDate] || []), newEntry]
    }));
    setNewFoodName('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.headerTitle}>Food Log</Text>

        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markedDates={{
              [selectedDate]: { selected: true, selectedColor: '#BB86FC' }
            }}
            theme={{
              backgroundColor: '#1e1e1e',
              calendarBackground: '#1e1e1e',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#BB86FC',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#BB86FC',
              dayTextColor: '#d9e1e8',
              textDisabledColor: '#2d4150',
              monthTextColor: '#ffffff',
              arrowColor: '#BB86FC',
              // Restore font styles now that we are on a stable dev build
              textMonthFontWeight: 'bold',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14
            }}
          />
        </View>

        <View style={styles.entriesContainer}>
          <Text style={styles.sectionTitle}>
            Meals for {new Date(selectedDate).toLocaleDateString()}
          </Text>

          {currentEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No meals logged yet.</Text>
            </View>
          ) : (
            currentEntries.map(entry => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryIcon}>
                  <Text>🍽️</Text>
                </View>
                <View>
                  <Text style={styles.entryName}>{entry.name}</Text>
                  <Text style={styles.entryTime}>{entry.time}</Text>
                </View>
              </View>
            ))
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Add meal (e.g., Oatmeal)"
              placeholderTextColor="#666"
              value={newFoodName}
              onChangeText={setNewFoodName}
            />
            <TouchableOpacity style={styles.addButton} onPress={addFood}>
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
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
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    margin: 24,
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
    padding: 24,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
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
  entryTime: {
    fontSize: 14,
    color: '#888',
  },
  inputContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#333',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#BB86FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#000',
  }
});
