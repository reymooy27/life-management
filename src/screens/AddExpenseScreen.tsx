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
import { Calendar, DateData } from 'react-native-calendars';
import { addExpense } from '../db/database';
import {
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  PAYMENT_METHODS,
  PaymentMethod,
  validateAmountInput,
} from '../features/finance/financeUtils';
import { RootStackParamList } from '../types/navigation';

const CATEGORY_EMOJIS: Record<string, string> = {
  Food: '🍔',
  Transport: '🚗',
  Bills: '📄',
  Entertainment: '🎬',
  Other: '📦',
};

const PAYMENT_EMOJIS: Record<string, string> = {
  Cash: '💵',
  Debit: '💳',
  Credit: '🏦',
};

export default function AddExpenseScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async () => {
    if (!description.trim()) {
      setError('Enter a description');
      return;
    }
    const amt = validateAmountInput(amount);
    if (amt === null) {
      setError('Enter a valid amount (whole number)');
      return;
    }
    setError('');
    await addExpense(description.trim(), amt, category, selectedDate, paymentMethod);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.input}
          placeholder="What did you spend on?"
          placeholderTextColor="#666"
          value={description}
          onChangeText={text => {
            setDescription(text);
            setError('');
          }}
        />

        <Text style={styles.label}>Amount (IDR)</Text>
        <TextInput
          style={styles.input}
          placeholder="50000"
          placeholderTextColor="#666"
          value={amount}
          onChangeText={text => {
            setAmount(text);
            setError('');
          }}
          keyboardType="numeric"
        />

        {/* Date Picker */}
        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowCalendar(!showCalendar)}
        >
          <Ionicons name="calendar-outline" size={18} color="#FFB74D" />
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
                [selectedDate]: { selected: true, selectedColor: '#FFB74D' },
              }}
              theme={{
                backgroundColor: '#1e1e1e',
                calendarBackground: '#1e1e1e',
                textSectionTitleColor: '#b6c1cd',
                selectedDayBackgroundColor: '#FFB74D',
                selectedDayTextColor: '#000',
                todayTextColor: '#FFB74D',
                dayTextColor: '#d9e1e8',
                textDisabledColor: '#2d4150',
                monthTextColor: '#fff',
                arrowColor: '#FFB74D',
                textMonthFontWeight: 'bold',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 12,
              }}
            />
          </View>
        )}

        {/* Category Picker */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.chipPicker}>
          {EXPENSE_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.chip, category === cat && styles.chipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                {CATEGORY_EMOJIS[cat]} {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Method */}
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.chipPicker}>
          {PAYMENT_METHODS.map(method => (
            <TouchableOpacity
              key={method}
              style={[styles.chip, paymentMethod === method && styles.chipActivePayment]}
              onPress={() => setPaymentMethod(method)}
            >
              <Text
                style={[
                  styles.chipText,
                  paymentMethod === method && styles.chipTextActive,
                ]}
              >
                {PAYMENT_EMOJIS[method]} {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
          <Ionicons name="add-circle" size={22} color="#000" />
          <Text style={styles.submitButtonText}>Add Expense</Text>
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
  },
  chipActive: {
    backgroundColor: '#FFB74D',
    borderColor: '#FFB74D',
  },
  chipActivePayment: {
    backgroundColor: '#BB86FC',
    borderColor: '#BB86FC',
  },
  chipText: {
    fontSize: 13,
    color: '#ccc',
  },
  chipTextActive: {
    color: '#000',
    fontWeight: '600',
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
    backgroundColor: '#FFB74D',
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
