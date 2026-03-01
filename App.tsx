import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AddExerciseScreen from './src/screens/AddExerciseScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import AddFoodScreen from './src/screens/AddFoodScreen';
import ExerciseScreen from './src/screens/ExerciseScreen';
import FinanceScreen from './src/screens/FinanceScreen';
import FoodScreen from './src/screens/FoodScreen';
import HomeScreen from './src/screens/HomeScreen';
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#121212' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Food"
          component={FoodScreen}
          options={{ gestureEnabled: true, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Exercise"
          component={ExerciseScreen}
          options={{ gestureEnabled: true, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Money"
          component={FinanceScreen}
          options={{ gestureEnabled: true, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AddFood"
          component={AddFoodScreen}
          options={{ gestureEnabled: true, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AddExercise"
          component={AddExerciseScreen}
          options={{ gestureEnabled: true, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ gestureEnabled: true, animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
