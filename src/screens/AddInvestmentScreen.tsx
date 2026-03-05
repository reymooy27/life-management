import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { addPortfolioEntry } from '../db/database';
import { RootStackParamList } from '../types/navigation';

type AssetType = 'crypto' | 'stock' | 'gold' | 'custom';

const ASSET_TYPES: { key: AssetType; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'crypto', label: 'Crypto', icon: 'logo-bitcoin', color: '#F7931A' },
  { key: 'stock', label: 'Stock', icon: 'trending-up', color: '#2196F3' },
  { key: 'gold', label: 'Gold', icon: 'diamond', color: '#FFD700' },
  { key: 'custom', label: 'Custom', icon: 'cube', color: '#9C27B0' },
];

export default function AddInvestmentScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [assetName, setAssetName] = useState('');
  const [ticker, setTicker] = useState('');
  const [assetType, setAssetType] = useState<AssetType>('crypto');
  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!assetName.trim()) {
      setError('Enter an asset name');
      return;
    }
    if (!ticker.trim()) {
      setError('Enter a ticker symbol');
      return;
    }
    const price = parseFloat(buyPrice);
    if (isNaN(price) || price <= 0) {
      setError('Enter a valid buy price');
      return;
    }
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Enter a valid quantity');
      return;
    }

    setError('');
    await addPortfolioEntry(
      assetName.trim(),
      ticker.trim(),
      assetType,
      price,
      qty,
      selectedDate,
      notes.trim()
    );
    navigation.goBack();
  };

  const handleGoldSelect = () => {
    setAssetType('gold');
    setAssetName('Gold');
    setTicker('GC=F');
  };

  return (
    <View style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {/* Asset Type */}
          <Text style={styles.label}>Asset Type</Text>
          <View style={styles.chipPicker}>
            {ASSET_TYPES.map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.chip,
                  assetType === type.key && { backgroundColor: type.color, borderColor: type.color },
                ]}
                onPress={() => {
                  if (type.key === 'gold') {
                    handleGoldSelect();
                  } else {
                    setAssetType(type.key);
                  }
                }}
              >
                <Ionicons
                  name={type.icon}
                  size={14}
                  color={assetType === type.key ? '#000' : type.color}
                />
                <Text
                  style={[
                    styles.chipText,
                    assetType === type.key && styles.chipTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Asset Name */}
          <Text style={styles.label}>Asset Name</Text>
          <TextInput
            style={styles.input}
            placeholder={assetType === 'crypto' ? 'e.g. Bitcoin' : assetType === 'stock' ? 'e.g. Bank BRI' : 'e.g. Gold'}
            placeholderTextColor="#666"
            value={assetName}
            onChangeText={text => {
              setAssetName(text);
              setError('');
            }}
          />

          {/* Ticker */}
          <Text style={styles.label}>
            Ticker Symbol
            {assetType === 'stock' && (
              <Text style={styles.labelHint}> (use .JK for Indonesian stocks)</Text>
            )}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              assetType === 'crypto' ? 'e.g. BTC, ETH, SOL'
                : assetType === 'stock' ? 'e.g. BBRI.JK, AAPL'
                : assetType === 'gold' ? 'GC=F'
                : 'e.g. CUSTOM1'
            }
            placeholderTextColor="#666"
            value={ticker}
            onChangeText={text => {
              setTicker(text);
              setError('');
            }}
            autoCapitalize="characters"
          />

          {/* Buy Price */}
          <Text style={styles.label}>
            Buy Price ({assetType === 'stock' && ticker.toUpperCase().endsWith('.JK') ? 'IDR' : 'USD'})
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#666"
            value={buyPrice}
            onChangeText={text => {
              setBuyPrice(text);
              setError('');
            }}
            keyboardType="decimal-pad"
          />

          {/* Quantity */}
          <Text style={styles.label}>Quantity</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#666"
            value={quantity}
            onChangeText={text => {
              setQuantity(text);
              setError('');
            }}
            keyboardType="decimal-pad"
          />

          {/* Date Picker */}
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowCalendar(!showCalendar)}
          >
            <Ionicons name="calendar-outline" size={18} color="#4CAF50" />
            <Text style={styles.dateButtonText}>{selectedDate}</Text>
            <Ionicons
              name={showCalendar ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#888"
            />
          </TouchableOpacity>

          {showCalendar && (
            <View style={styles.calendarContainer}>
              <Calendar
                onDayPress={(day: DateData) => {
                  setSelectedDate(day.dateString);
                  setShowCalendar(false);
                }}
                markedDates={{
                  [selectedDate]: { selected: true, selectedColor: '#4CAF50' },
                }}
                theme={{
                  backgroundColor: '#1e1e1e',
                  calendarBackground: '#1e1e1e',
                  textSectionTitleColor: '#b6c1cd',
                  selectedDayBackgroundColor: '#4CAF50',
                  selectedDayTextColor: '#000',
                  todayTextColor: '#4CAF50',
                  dayTextColor: '#d9e1e8',
                  textDisabledColor: '#2d4150',
                  monthTextColor: '#fff',
                  arrowColor: '#4CAF50',
                  textMonthFontWeight: 'bold',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 12,
                }}
              />
            </View>
          )}

          {/* Notes */}
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Add notes about this investment..."
            placeholderTextColor="#666"
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
            <Ionicons name="add-circle" size={22} color="#000" />
            <Text style={styles.submitButtonText}>Add Investment</Text>
          </TouchableOpacity>
        </View>
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
  labelHint: {
    fontSize: 11,
    color: '#666',
    textTransform: 'none',
    letterSpacing: 0,
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
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    color: '#ccc',
  },
  chipTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  dateButtonText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  calendarContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 8,
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
    backgroundColor: '#4CAF50',
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
