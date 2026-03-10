import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import {
  addFoodEntry,
  deleteFoodEntry,
  ExerciseEntryRow,
  FoodEntryRow,
  getExerciseEntries,
  getFoodEntries,
  getUserSettings,
  UserSettings,
} from '../db/database';
import { AudioExtractionResult, processVoiceToFood } from '../features/ai/aiService';
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

  const [isRecording, setIsRecording] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');

  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [pendingVoiceEntry, setPendingVoiceEntry] = useState<AudioExtractionResult | null>(null);

  useSpeechRecognitionEvent('result', (event) => {
    setTranscriptText(event.results[0]?.transcript || '');
  });

  const swipeRefs = useRef<{ [key: number]: ScrollView | null }>({});
  const activeSwipeId = useRef<number | null>(null);
  const isPressingBtn = useRef<boolean>(false);

  const handleScrollBeginDrag = (id: number) => {
    if (activeSwipeId.current !== null && activeSwipeId.current !== id) {
      swipeRefs.current[activeSwipeId.current]?.scrollTo({ x: 0, animated: true });
    }
    activeSwipeId.current = id;
  };

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

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Meal',
      'Are you sure you want to delete this meal logged?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFoodEntry(id);
            loadEntries();
          }
        }
      ]
    );
  };

  const startRecording = async () => {
    isPressingBtn.current = true;
    if (!settings?.gemini_api_key) {
      Alert.alert('Missing API Key', 'Please add your Gemini API Key in Settings first to use voice logging.');
      isPressingBtn.current = false;
      return;
    }
    try {
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
         Alert.alert('Permission Denied', 'Microphone permission is required.');
         isPressingBtn.current = false;
         return;
      }

      // If the permission dialog was just dismissed, the gesture might have been interrupted.
      // If the user is no longer holding the button, abort to prevent a runaway background recording!
      if (!isPressingBtn.current) return;

      setTranscriptText('');
      setIsRecording(true);

      // Play start haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      ExpoSpeechRecognitionModule.start({
        lang: 'id-ID',
        interimResults: true,
        requiresOnDeviceRecognition: false,
      });

    } catch (err) {
      console.error('Failed to start recording', err);
      // Fail silently if it is a transient background activity detachment
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    isPressingBtn.current = false;
    if (!isRecording) return;

    ExpoSpeechRecognitionModule.stop();
    setIsRecording(false);

    // Play stop haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If they stopped before generating any letters, do nothing
    if (!transcriptText?.trim()) return;

    setIsProcessingVoice(true);

    try {
      const foodData = await processVoiceToFood(transcriptText, settings!.gemini_api_key!);

      // Temporarily hold it in state and present the verification Modal instead of committing
      setPendingVoiceEntry(foodData);

    } catch (err: any) {
      console.error('Voice processing failed', err);
      Alert.alert('AI Error', err.message || 'Failed to understand audio.');
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const handleConfirmVoiceEntry = async () => {
    if (!pendingVoiceEntry) return;
    try {
      await addFoodEntry(
        pendingVoiceEntry.name,
        pendingVoiceEntry.calories,
        pendingVoiceEntry.category,
        pendingVoiceEntry.protein,
        pendingVoiceEntry.carbs,
        pendingVoiceEntry.fats,
        selectedDate,
        new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
      setPendingVoiceEntry(null);
      loadEntries();
    } catch (e) {
      Alert.alert('Error', 'Failed to save voice log');
    }
  };

  const handleEdit = (entry: FoodEntryRow) => {
    navigation.navigate('AddFood', { editEntry: entry });
  };

  const SCREEN_WIDTH = Dimensions.get('window').width;

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
              <View key={entry.id} style={styles.swipeContainer}>
                <ScrollView
                   ref={(el) => { swipeRefs.current[entry.id] = el; }}
                   onScrollBeginDrag={() => handleScrollBeginDrag(entry.id)}
                   horizontal
                   pagingEnabled
                   showsHorizontalScrollIndicator={false}
                   snapToInterval={SCREEN_WIDTH - 48}
                   decelerationRate="fast"
                   contentContainerStyle={{ width: (SCREEN_WIDTH - 48) + 120, flexDirection: 'row' }}
                >
                  <View style={[styles.entryCard, { width: SCREEN_WIDTH - 48 }]}>
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
                  </View>

                  {/* Inline Action Buttons */}
                  <View style={styles.actionMenu}>
                     <TouchableOpacity
                       style={[styles.actionBtn, { backgroundColor: '#333' }]}
                       onPress={() => handleEdit(entry)}
                     >
                       <Ionicons name="pencil" size={20} color="#BB86FC" />
                     </TouchableOpacity>
                     <TouchableOpacity
                       style={[styles.actionBtn, { backgroundColor: '#CF6679' }]}
                       onPress={() => handleDelete(entry.id)}
                     >
                       <Ionicons name="trash" size={20} color="#fff" />
                     </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Live Transcript Bubble */}
      {isRecording && (
        <View style={styles.liveTranscriptBubble}>
          <Text style={styles.liveTranscriptText}>
            {transcriptText || "Listening..."}
          </Text>
        </View>
      )}

      {/* FABs */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[
             styles.fab,
             { backgroundColor: isProcessingVoice ? '#888' : (isRecording ? '#CF6679' : '#03DAC6') }
          ]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={isProcessingVoice}
        >
          <Ionicons name={isProcessingVoice ? "hourglass-outline" : (isRecording ? "mic-off" : "mic")} size={28} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddFood')}
        >
          <Ionicons name="add" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Voice Transcript Confirmation Modal */}
      <Modal visible={!!pendingVoiceEntry} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Did I calculate this correctly?</Text>

            <View style={styles.modalTranscriptBox}>
              <Text style={styles.modalTranscriptLabel}>Transcript:</Text>
              <Text style={styles.modalTranscriptText}>"{pendingVoiceEntry?.transcript}"</Text>
            </View>

            <Text style={styles.modalMacroText}>
              <Text style={styles.modalMacroHighlight}>{pendingVoiceEntry?.name}</Text>
            </Text>
            <Text style={styles.modalMacroText}>
              <Text style={{color: '#888'}}>{pendingVoiceEntry?.category}</Text>
            </Text>

            <View style={styles.tagGrid}>
              <View style={styles.macroTag}>
                <Ionicons name="flame" size={12} color="#CF6679" />
                <Text style={styles.macroTagText}>{pendingVoiceEntry?.calories} kcal</Text>
              </View>
              <View style={styles.macroTag}>
                <Text style={styles.macroTagText}>Protein: {pendingVoiceEntry?.protein}g</Text>
              </View>
              <View style={styles.macroTag}>
                <Text style={styles.macroTagText}>Carbs: {pendingVoiceEntry?.carbs}g</Text>
              </View>
              <View style={styles.macroTag}>
                <Text style={styles.macroTagText}>Fats: {pendingVoiceEntry?.fats}g</Text>
              </View>
            </View>

            <View style={styles.modalBtnGroup}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setPendingVoiceEntry(null)}
              >
                <Text style={styles.modalBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={handleConfirmVoiceEntry}
              >
                <Text style={styles.modalBtnText}>Log to Journal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    marginBottom: 150,
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
  swipeContainer: {
    marginBottom: 12,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionMenu: {
    width: 120,
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    height: '100%',
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
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    alignItems: 'center',
    gap: 16,
  },
  fab: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTranscriptBox: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalTranscriptLabel: {
    fontSize: 12,
    color: '#BB86FC',
    fontWeight: '600',
    marginBottom: 4,
  },
  modalTranscriptText: {
    fontSize: 14,
    color: '#e0e0e0',
    fontStyle: 'italic',
  },
  modalMacroText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalMacroHighlight: {
    color: '#03DAC6',
    fontWeight: 'bold',
    fontSize: 18,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 24,
  },
  macroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  macroTagText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  modalBtnGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#BB86FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#CF6679',
  },
  modalBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 15,
  },
  liveTranscriptBubble: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    left: 24,
    backgroundColor: '#BB86FC',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#BB86FC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  liveTranscriptText: {
    color: '#121212',
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
