import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface FeatureCardProps {
  title: string;
  emoji: string;
  onPress: () => void;
}

function FeatureCard({ title, emoji, onPress }: FeatureCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={{ flex: 1 }} />
      <Text style={styles.arrow}>→</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>LifeManager</Text>
          <Text style={styles.subtitle}>Master your day, one step at a time.</Text>
        </View>

        <View style={styles.cardContainer}>
          <FeatureCard
            title="Food Tracker"
            emoji="🥗"
            onPress={() => navigation.navigate('Food')}
          />
        </View>

        <StatusBar style="light" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  arrow: {
    fontSize: 24,
    color: '#666',
  }
});
