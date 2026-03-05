import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { initNotifications } from './src/features/notifications/notificationService';
import AddExerciseScreen from './src/screens/AddExerciseScreen';
import AddExpenseScreen from './src/screens/AddExpenseScreen';
import AddFoodScreen from './src/screens/AddFoodScreen';
import AddWaterScreen from './src/screens/AddWaterScreen';
import ExerciseScreen from './src/screens/ExerciseScreen';
import FinanceScreen from './src/screens/FinanceScreen';
import FoodScreen from './src/screens/FoodScreen';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import WaterScreen from './src/screens/WaterScreen';
import { RootStackParamList } from './src/types/navigation';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator<RootStackParamList>();

const HEADER_STYLE = {
  headerStyle: {
    backgroundColor: '#121212',
   },
  headerTintColor: '#fff',
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 16},
};

export default function App() {
  React.useEffect(() => {
    // Hide the splash screen after the component mounts
    SplashScreen.hideAsync();

    // Setup local notifications based on user settings
    initNotifications();
  }, []);

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
          options={{
            ...HEADER_STYLE,
            headerShown: true,
            title: 'Food Log',
            gestureEnabled: true,
            animationDuration: 300,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="Exercise"
          component={ExerciseScreen}
          options={{
            ...HEADER_STYLE,
            headerShown: true,
            title: 'Exercise Log',
            gestureEnabled: true,
            animationDuration: 300,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="Money"
          component={FinanceScreen}
          options={{
            ...HEADER_STYLE,
            headerShown: true,
            title: 'Finance',
            gestureEnabled: true,
            animationDuration: 300,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="AddFood"
          component={AddFoodScreen}
          options={{
            ...HEADER_STYLE,
            headerShown: true,
            title: 'Add Food',
            gestureEnabled: true,
            animationDuration: 300,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="AddExercise"
          component={AddExerciseScreen}
          options={{
            ...HEADER_STYLE,
            headerShown: true,
            title: 'Add Exercise',
            gestureEnabled: true,
            animationDuration: 300,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{
            ...HEADER_STYLE,
            headerShown: true,
            title: 'Add Expense',
            gestureEnabled: true,
            animationDuration: 300,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            ...HEADER_STYLE,
            headerShown: true,
            title: 'Settings',
            gestureEnabled: true,
            animationDuration: 300,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="Water"
          component={WaterScreen}
          options={{
            ...HEADER_STYLE,
            headerShown: true,
            title: 'Water Tracker',
            gestureEnabled: true,
            animationDuration: 300,
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="AddWater"
          component={AddWaterScreen}
          options={{
            ...HEADER_STYLE,
            headerShown: true,
            title: 'Add Water',
            gestureEnabled: true,
            animationDuration: 300,
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
