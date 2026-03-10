import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getUserSettings, saveUserSettings } from '../db/database';
import { initNotifications } from '../features/notifications/notificationService';
import {
    ACTIVITY_LEVELS,
    calculateAge,
    calculateBMR,
    calculateTDEE,
    validateMeasurement,
} from '../features/settings/settingsUtils';
import { RootStackParamList } from '../types/navigation';

export default function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | null>(null);
  const [activityLevel, setActivityLevel] = useState('');
  const [waterGoal, setWaterGoal] = useState<number | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  // Notification settings
  const [waterNotifEnabled, setWaterNotifEnabled] = useState(false);
  const [waterNotifInterval, setWaterNotifInterval] = useState(2);
  const [exerciseMorningEnabled, setExerciseMorningEnabled] = useState(false);
  const [exerciseAfternoonEnabled, setExerciseAfternoonEnabled] = useState(false);

  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [isActivityModalVisible, setActivityModalVisible] = useState(false);
  const [isWaterIntervalVisible, setWaterIntervalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Derived metrics
  const displayAge = calculateAge(birthdate);
  const parsedWeight = validateMeasurement(weight) || 0;
  const parsedHeight = validateMeasurement(height) || 0;
  const displayBMR = calculateBMR(parsedWeight, parsedHeight, displayAge, gender || 'Male');
  const displayTDEE = calculateTDEE(displayBMR, activityLevel);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getUserSettings();
      if (settings) {
        setWeight(settings.weight_kg ? settings.weight_kg.toString() : '');
        setHeight(settings.height_cm ? settings.height_cm.toString() : '');
        setBirthdate(settings.birthdate || '');
        setGender((settings.gender as 'Male' | 'Female') || null);
        setActivityLevel(settings.activity_level || '');
        setWaterGoal(settings.water_goal_ml || null);
        setWaterNotifEnabled(!!settings.water_notif_enabled);
        setWaterNotifInterval(settings.water_notif_interval_hours || 2);
        setExerciseMorningEnabled(!!settings.exercise_morning_notif_enabled);
        setExerciseAfternoonEnabled(!!settings.exercise_afternoon_notif_enabled);
        setGeminiApiKey(settings.gemini_api_key || '');
      }
    } catch (error) {
      console.error('Failed to load settings', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const validWeight = validateMeasurement(weight);
      const validHeight = validateMeasurement(height);

      if (weight && !validWeight) {
        Alert.alert('Invalid Weight', 'Please enter a valid positive number for weight.');
        setIsSaving(false);
        return;
      }
      if (height && !validHeight) {
        Alert.alert('Invalid Height', 'Please enter a valid positive number for height.');
        setIsSaving(false);
        return;
      }

      await saveUserSettings({
        weight_kg: validWeight,
        height_cm: validHeight,
        birthdate: birthdate || null,
        gender: gender || null,
        activity_level: activityLevel || null,
        water_goal_ml: waterGoal,
        water_notif_enabled: waterNotifEnabled ? 1 : 0,
        water_notif_interval_hours: waterNotifInterval,
        exercise_morning_notif_enabled: exerciseMorningEnabled ? 1 : 0,
        exercise_afternoon_notif_enabled: exerciseAfternoonEnabled ? 1 : 0,
        gemini_api_key: geminiApiKey || null,
      });

      // Re-initialize notifications with new settings
      await initNotifications();

      navigation.goBack();
    } catch (error) {
      console.error('Failed to save settings', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const getActiveLevelLabel = () => {
    const level = ACTIVITY_LEVELS.find(l => l.value === activityLevel);
    return level ? level.label : 'Select Activity Level';
  };

  const WATER_INTERVAL_OPTIONS = [
    { label: 'Every 1 Hour', value: 1 },
    { label: 'Every 1.5 Hours', value: 1.5 },
    { label: 'Every 2 Hours (Recommended)', value: 2 },
    { label: 'Every 3 Hours', value: 3 },
  ];

  const getWaterIntervalLabel = () => {
    const opt = WATER_INTERVAL_OPTIONS.find(o => o.value === waterNotifInterval);
    return opt ? opt.label : 'Every 2 Hours';
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Profile Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profile Details</Text>

          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 70"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
            <View style={{ width: 16 }} />
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 175"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
              />
            </View>
          </View>

          <Text style={styles.label}>Birthdate</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setCalendarVisible(true)}
          >
            <Text style={[styles.selectorText, !birthdate && styles.selectorPlaceholder]}>
              {birthdate || 'Select Birthdate'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#888" />
          </TouchableOpacity>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segment, gender === 'Male' && styles.segmentActive]}
              onPress={() => setGender('Male')}
            >
              <Text style={[styles.segmentText, gender === 'Male' && styles.segmentTextActive]}>
                Male
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, gender === 'Female' && styles.segmentActive]}
              onPress={() => setGender('Female')}
            >
              <Text style={[styles.segmentText, gender === 'Female' && styles.segmentTextActive]}>
                Female
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Activity Level</Text>
          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setActivityModalVisible(true)}
          >
            <Text style={[styles.selectorText, !activityLevel && styles.selectorPlaceholder]}>
              {getActiveLevelLabel()}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Calculated Metrics Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Metrics</Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>{displayAge || '--'}</Text>
              <Text style={styles.metricLabel}>Age (Years)</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#BB86FC' }]}>
                {displayBMR > 0 ? displayBMR : '--'}
              </Text>
              <Text style={styles.metricLabel}>BMR (kCal)</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: '#03DAC6' }]}>
                {displayTDEE > 0 ? displayTDEE : '--'}
              </Text>
              <Text style={styles.metricLabel}>TDEE (kCal)</Text>
            </View>
          </View>

          <Text style={styles.metricsHint}>
            Fill in all profile details to see your calculated Basal Metabolic Rate and Total Daily Energy Expenditure.
          </Text>
        </View>

        {/* Notifications Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Water Reminders</Text>
              <Text style={styles.settingHint}>Hydration reminders (7 AM - 9 PM)</Text>
            </View>
            <Switch
              value={waterNotifEnabled}
              onValueChange={setWaterNotifEnabled}
              trackColor={{ false: '#333', true: '#BB86FC' }}
              thumbColor={waterNotifEnabled ? '#121212' : '#888'}
            />
          </View>

          {waterNotifEnabled && (
            <View style={styles.nestedSetting}>
              <Text style={styles.label}>Reminder Interval</Text>
              <TouchableOpacity
                style={styles.selectorButton}
                onPress={() => setWaterIntervalVisible(true)}
              >
                <Text style={styles.selectorText}>{getWaterIntervalLabel()}</Text>
                <Ionicons name="chevron-down" size={20} color="#888" />
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.settingRow, { marginTop: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Morning Exercise</Text>
              <Text style={styles.settingHint}>Reminder at 7:00 AM if not logged</Text>
            </View>
            <Switch
              value={exerciseMorningEnabled}
              onValueChange={setExerciseMorningEnabled}
              trackColor={{ false: '#333', true: '#03DAC6' }}
              thumbColor={exerciseMorningEnabled ? '#121212' : '#888'}
            />
          </View>

          <View style={[styles.settingRow, { marginTop: 16 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Afternoon Exercise</Text>
              <Text style={styles.settingHint}>Reminder at 5:00 PM to wrap up</Text>
            </View>
            <Switch
              value={exerciseAfternoonEnabled}
              onValueChange={setExerciseAfternoonEnabled}
              trackColor={{ false: '#333', true: '#03DAC6' }}
              thumbColor={exerciseAfternoonEnabled ? '#121212' : '#888'}
            />
          </View>
        </View>

        {/* AI Features Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AI Features</Text>
          <Text style={styles.settingHint}>
            To use the AI Voice Food Tracker, you will need a free Google Gemini API key from Google AI Studio.
          </Text>
          
          <Text style={styles.label}>Gemini API Key</Text>
          <TextInput
            style={styles.input}
            placeholder="AIzaSy..."
            placeholderTextColor="#666"
            value={geminiApiKey}
            onChangeText={setGeminiApiKey}
            secureTextEntry={true}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Ionicons name="save-outline" size={22} color="#000" />
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Settings'}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Birthdate Picker */}
      {isCalendarVisible && (
        Platform.OS === 'ios' ? (
          <Modal visible={isCalendarVisible} animationType="slide" transparent={true}>
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                    <Text style={styles.modalCloseText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCalendarVisible(false)}>
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={
                    birthdate
                      ? (() => {
                          const [y, m, d] = birthdate.split('-').map(Number);
                          return new Date(y, m - 1, d);
                        })()
                      : new Date()
                  }
                  mode="date"
                  display="spinner"
                  textColor="white"
                  themeVariant="dark"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      const y = selectedDate.getFullYear();
                      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const d = String(selectedDate.getDate()).padStart(2, '0');
                      setBirthdate(`${y}-${m}-${d}`);
                    }
                  }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={
              birthdate
                ? (() => {
                    const [y, m, d] = birthdate.split('-').map(Number);
                    return new Date(y, m - 1, d);
                  })()
                : new Date()
            }
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, selectedDate) => {
              setCalendarVisible(false);
              if (event.type === 'set' && selectedDate) {
                const y = selectedDate.getFullYear();
                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const d = String(selectedDate.getDate()).padStart(2, '0');
                setBirthdate(`${y}-${m}-${d}`);
              }
            }}
          />
        )
      )}

      {/* Activity Level Modal */}
      <Modal visible={isActivityModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBottomSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Activity Level</Text>
              <TouchableOpacity onPress={() => setActivityModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.optionButton,
                  activityLevel === level.value && styles.optionButtonActive,
                ]}
                onPress={() => {
                  setActivityLevel(level.value);
                  setActivityModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    activityLevel === level.value && styles.optionTextActive,
                  ]}
                >
                  {level.label}
                </Text>
                {activityLevel === level.value && (
                  <Ionicons name="checkmark" size={20} color="#03DAC6" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Water Interval Modal */}
      <Modal visible={isWaterIntervalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBottomSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reminder Interval</Text>
              <TouchableOpacity onPress={() => setWaterIntervalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {WATER_INTERVAL_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.optionButton,
                  waterNotifInterval === opt.value && styles.optionButtonActive,
                ]}
                onPress={() => {
                  setWaterNotifInterval(opt.value);
                  setWaterIntervalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    waterNotifInterval === opt.value && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
                {waterNotifInterval === opt.value && (
                  <Ionicons name="checkmark" size={20} color="#BB86FC" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 16,
  },
  selectorButton: {
    backgroundColor: '#121212',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    color: '#fff',
    fontSize: 16,
  },
  selectorPlaceholder: {
    color: '#666',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#333',
  },
  segmentText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  metricLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#333',
  },
  metricsHint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#BB86FC',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 4,
  },
  settingHint: {
    fontSize: 13,
    color: '#888',
  },
  nestedSetting: {
    marginTop: 12,
    marginLeft: 0,
    borderLeftWidth: 2,
    borderLeftColor: '#333',
    paddingLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
  },
  modalContent: {
    margin: 20,
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#CF6679',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  datePickerContainer: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  datePickerDoneText: {
    color: '#BB86FC',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBottomSheet: {
    marginTop: 'auto',
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  optionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  optionButtonActive: {
    backgroundColor: 'rgba(3, 218, 198, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  optionText: {
    color: '#eee',
    fontSize: 16,
  },
  optionTextActive: {
    color: '#03DAC6',
    fontWeight: '600',
  },
});
