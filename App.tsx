import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>LifeManager</Text>
        <Text style={styles.subtitle}>Master your day, one step at a time.</Text>

        <View style={styles.cardContainer}>
          <FeatureCard title="Food" emoji="🥗" />
          <FeatureCard title="Exercise" emoji="💪" />
          <FeatureCard title="Money" emoji="💰" />
        </View>

        <StatusBar style="light" />
      </View>
    </SafeAreaView>
  );
}

interface FeatureCardProps {
  title: string;
  emoji: string;
}

function FeatureCard({ title, emoji }: FeatureCardProps) {
  return (
    <TouchableOpacity style={styles.card}>
      <View style={styles.iconContainer}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212', // Premium Dark Background
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
    marginBottom: 48,
    textAlign: 'center',
  },
  cardContainer: {
    width: '100%',
    gap: 16,
  },
  card: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2c2c2c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  emoji: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e0e0e0',
  },
});
