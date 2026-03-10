import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { addFoodEntry, FoodEntryRow, getRecentFoods, updateFoodEntry } from '../db/database';
import { FoodItem, searchFoods } from '../features/food/calorieData';
import { validateCalorieInput } from '../features/food/calorieUtils';
import { RootStackParamList } from '../types/navigation';

type AddFoodScreenRouteProp = RouteProp<RootStackParamList, 'AddFood'>;

export default function AddFoodScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<AddFoodScreenRouteProp>();
  const editEntry = route.params?.editEntry;

  const [newFoodName, setNewFoodName] = useState(editEntry?.name || '');
  const [newCalories, setNewCalories] = useState(editEntry ? String(editEntry.calories) : '');
  const [category, setCategory] = useState(editEntry?.category || 'Snack');
  const [protein, setProtein] = useState(editEntry ? String(editEntry.protein) : '');
  const [carbs, setCarbs] = useState(editEntry ? String(editEntry.carbs) : '');
  const [fats, setFats] = useState(editEntry ? String(editEntry.fats) : '');

  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodEntryRow[]>([]);
  const [calorieError, setCalorieError] = useState('');

  React.useEffect(() => {
    loadRecentFoods();
  }, []);

  const loadRecentFoods = async () => {
    const list = await getRecentFoods(5);
    setRecentFoods(list);
  };

  const handleSearch = (text: string) => {
    setNewFoodName(text);
    setCalorieError('');
    if (text.length >= 2) {
      setSearchResults(searchFoods(text));
    } else {
      setSearchResults([]);
    }
  };

  const selectFood = (item: FoodItem | FoodEntryRow) => {
    setNewFoodName(item.name);
    if ('caloriesPerServing' in item) {
      setNewCalories(String(item.caloriesPerServing));
      setCategory(item.category || 'Snack');
      setProtein(item.protein ? String(item.protein) : '');
      setCarbs(item.carbs ? String(item.carbs) : '');
      setFats(item.fats ? String(item.fats) : '');
    } else {
      setNewCalories(String(item.calories));
      setCategory(item.category || 'Snack');
      setProtein(String(item.protein || 0));
      setCarbs(String(item.carbs || 0));
      setFats(String(item.fats || 0));
    }
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
    const p = protein ? validateCalorieInput(protein) || 0 : 0;
    const c = carbs ? validateCalorieInput(carbs) || 0 : 0;
    const f = fats ? validateCalorieInput(fats) || 0 : 0;

    setCalorieError('');

    if (editEntry) {
      await updateFoodEntry(editEntry.id, newFoodName.trim(), cal, category, p, c, f);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      await addFoodEntry(newFoodName.trim(), cal, category, p, c, f, today, time);
    }

    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Meal Category</Text>
        <View style={styles.segmentContainer}>
          {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.segment, category === cat && styles.segmentActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.segmentText, category === cat && styles.segmentTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

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

        {searchResults.length === 0 && !newFoodName && recentFoods.length > 0 && (
          <View style={styles.recentContainer}>
            <Text style={styles.recentTitle}>Recent Foods</Text>
            {recentFoods.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.recentItem}
                onPress={() => selectFood(item)}
              >
                <Ionicons name="time-outline" size={18} color="#03DAC6" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.recentItemName}>{item.name}</Text>
                  <Text style={styles.recentItemDetail}>
                    {item.calories} cal · {item.category}
                  </Text>
                </View>
                <Ionicons name="add-circle-outline" size={20} color="#666" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Calories</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#666"
              value={newCalories}
              onChangeText={text => {
                setNewCalories(text);
                setCalorieError('');
              }}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={[styles.row, { marginTop: 12 }]}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Protein (g)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#666"
              value={protein}
              onChangeText={setProtein}
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Carbs (g)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#666"
              value={carbs}
              onChangeText={setCarbs}
              keyboardType="numeric"
            />
          </View>
          <View style={{ width: 12 }} />
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fats (g)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#666"
              value={fats}
              onChangeText={setFats}
              keyboardType="numeric"
            />
          </View>
        </View>



        {calorieError ? <Text style={styles.errorText}>{calorieError}</Text> : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
          <Ionicons name={editEntry ? "save" : "add-circle"} size={22} color="#000" />
          <Text style={styles.submitButtonText}>
            {editEntry ? "Save Changes" : "Add Food Entry"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
  row: {
    flexDirection: 'row',
  },
  inputGroup: {
    flex: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e1e1e',
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
    fontSize: 13,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
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
  recentContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  recentItemName: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  recentItemDetail: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
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
