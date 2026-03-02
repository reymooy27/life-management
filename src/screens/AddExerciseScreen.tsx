import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { addExerciseEntry } from '../db/database';
import { validateCalorieInput } from '../features/food/calorieUtils';
import { RootStackParamList } from '../types/navigation';

export default function AddExerciseScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [exerciseName, setExerciseName] = useState('');
  const [duration, setDuration] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [error, setError] = useState('');

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
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    await addExerciseEntry(exerciseName.trim(), dur, cal, today, time);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Exercise Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Running, Swimming..."
          placeholderTextColor="#666"
          value={exerciseName}
          onChangeText={text => {
            setExerciseName(text);
            setError('');
          }}
        />

        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          placeholder="30"
          placeholderTextColor="#666"
          value={duration}
          onChangeText={text => {
            setDuration(text);
            setError('');
          }}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Calories Burned</Text>
        <TextInput
          style={styles.input}
          placeholder="200"
          placeholderTextColor="#666"
          value={caloriesBurned}
          onChangeText={text => {
            setCaloriesBurned(text);
            setError('');
          }}
          keyboardType="numeric"
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
          <Ionicons name="add-circle" size={22} color="#000" />
          <Text style={styles.submitButtonText}>Add Exercise Entry</Text>
        </TouchableOpacity>
      </View>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  form: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 16,
  },
  errorText: {
    color: '#CF6679',
    fontSize: 13,
    marginTop: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#03DAC6',
    borderRadius: 16,
    padding: 16,
    marginTop: 32,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
