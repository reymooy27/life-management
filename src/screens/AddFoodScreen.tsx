import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addFoodEntry } from '../db/database';
import { FoodItem, searchFoods } from '../features/food/calorieData';
import { validateCalorieInput } from '../features/food/calorieUtils';
import { RootStackParamList } from '../types/navigation';

export default function AddFoodScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [newFoodName, setNewFoodName] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [calorieError, setCalorieError] = useState('');

  const handleSearch = (text: string) => {
    setNewFoodName(text);
    setCalorieError('');
    if (text.length >= 2) {
      setSearchResults(searchFoods(text));
    } else {
      setSearchResults([]);
    }
  };

  const selectFood = (item: FoodItem) => {
    setNewFoodName(item.name);
    setNewCalories(String(item.caloriesPerServing));
    setSearchResults([]);
  };

  const handleAdd = async () => {
    if (!newFoodName.trim()) {
      setCalorieError('Enter a food name');
      return;
    }
    const cal = validateCalorieInput(newCalories);
    if (cal === null) {
      setCalorieError('Enter a valid calorie count');
      return;
    }
    setCalorieError('');
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    await addFoodEntry(newFoodName.trim(), cal, today, time);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Food</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Food Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Search or type food name..."
          placeholderTextColor="#666"
          value={newFoodName}
          onChangeText={handleSearch}
        />

        {searchResults.length > 0 && (
          <View style={styles.searchList}>
            <FlatList
              data={searchResults}
              keyExtractor={item => item.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchItem}
                  onPress={() => selectFood(item)}
                >
                  <Ionicons name="restaurant-outline" size={18} color="#BB86FC" />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.searchItemName}>{item.name}</Text>
                    <Text style={styles.searchItemCal}>{item.caloriesPerServing} cal</Text>
                  </View>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 200 }}
            />
          </View>
        )}

        <Text style={styles.label}>Calories</Text>
        <TextInput
          style={styles.input}
          placeholder="Calories"
          placeholderTextColor="#666"
          value={newCalories}
          onChangeText={text => {
            setNewCalories(text);
            setCalorieError('');
          }}
          keyboardType="numeric"
        />

        {calorieError ? <Text style={styles.errorText}>{calorieError}</Text> : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
          <Ionicons name="add-circle" size={22} color="#000" />
          <Text style={styles.submitButtonText}>Add Food Entry</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
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
  searchList: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 4,
    overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  searchItemName: {
    fontSize: 15,
    color: '#fff',
  },
  searchItemCal: {
    fontSize: 12,
    color: '#888',
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
    backgroundColor: '#BB86FC',
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
