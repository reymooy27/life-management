import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import {
    addExpense,
    addExpenseCategory,
    addPaymentMethod,
    CustomCategoryRow,
    CustomPaymentMethodRow,
    deleteExpenseCategory,
    deletePaymentMethod,
    getExpenseCategories,
    getPaymentMethods,
    updateExpenseCategory,
    updatePaymentMethod,
} from '../db/database';
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

  const [categories, setCategories] = useState<CustomCategoryRow[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<CustomPaymentMethodRow[]>([]);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const cats = await getExpenseCategories();
      const methods = await getPaymentMethods();
      setCategories(cats);
      setPaymentMethods(methods);

      // Auto select first entry if current is not in list
      if (cats.length > 0 && !cats.find(c => c.name === category)) {
        setCategory(cats[0].name);
      }
      if (methods.length > 0 && !methods.find(m => m.name === paymentMethod)) {
        setPaymentMethod(methods[0].name);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add_category' | 'add_payment' | 'edit_category' | 'edit_payment'>('add_category');
  const [modalInputValue, setModalInputValue] = useState('');
  const [editingItem, setEditingItem] = useState<{name: string, id: number} | null>(null);

  const handleOpenAddModal = (type: 'add_category' | 'add_payment') => {
    setModalType(type);
    setModalInputValue('');
    setEditingItem(null);
    setIsModalVisible(true);
  };

  const handleOpenEditModal = (type: 'edit_category' | 'edit_payment', item: {name: string, id: number}) => {
    setModalType(type);
    setModalInputValue(item.name);
    setEditingItem(item);
    setIsModalVisible(true);
  };

  const handleSaveModal = async () => {
    const val = modalInputValue.trim();
    if (!val) {
      Alert.alert('Error', 'Name cannot be empty.');
      return;
    }

    try {
      if (modalType === 'add_category') {
        if (categories.some(c => c.name.toLowerCase() === val.toLowerCase())) {
          Alert.alert('Error', 'Category already exists.');
          return;
        }
        await addExpenseCategory(val);
        setCategory(val);
      } else if (modalType === 'add_payment') {
        if (paymentMethods.some(m => m.name.toLowerCase() === val.toLowerCase())) {
          Alert.alert('Error', 'Payment method already exists.');
          return;
        }
        await addPaymentMethod(val);
        setPaymentMethod(val);
      } else if (modalType === 'edit_category' && editingItem) {
        if (val !== editingItem.name) {
          if (categories.some(c => c.name.toLowerCase() === val.toLowerCase())) {
             Alert.alert('Error', 'Category name already exists.');
             return;
          }
          await updateExpenseCategory(editingItem.name, val);
          if (category === editingItem.name) setCategory(val);
        }
      } else if (modalType === 'edit_payment' && editingItem) {
        if (val !== editingItem.name) {
          if (paymentMethods.some(m => m.name.toLowerCase() === val.toLowerCase())) {
             Alert.alert('Error', 'Payment method name already exists.');
             return;
          }
          await updatePaymentMethod(editingItem.name, val);
          if (paymentMethod === editingItem.name) setPaymentMethod(val);
        }
      }
      setIsModalVisible(false);
      loadPreferences();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;

    Alert.alert(
      'Delete Confirmation',
      `Are you sure you want to delete "${editingItem.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (modalType === 'edit_category') {
                await deleteExpenseCategory(editingItem.name);
                if (category === editingItem.name) setCategory('Food');
              } else if (modalType === 'edit_payment') {
                await deletePaymentMethod(editingItem.name);
                if (paymentMethod === editingItem.name) setPaymentMethod('Cash');
              }
              setIsModalVisible(false);
              loadPreferences();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Cannot delete item.');
            }
          }
        }
      ]
    );
  };

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
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, category === cat.name && styles.chipActive]}
              onPress={() => setCategory(cat.name)}
              onLongPress={() => handleOpenEditModal('edit_category', cat)}
            >
              <Text style={[styles.chipText, category === cat.name && styles.chipTextActive]}>
                {CATEGORY_EMOJIS[cat.name] || '📦'} {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.chipAdd}
            onPress={() => handleOpenAddModal('add_category')}
          >
            <Ionicons name="add" size={16} color="#aaa" />
            <Text style={styles.chipAddText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.chipPicker}>
          {paymentMethods.map(method => (
            <TouchableOpacity
              key={method.id}
              style={[styles.chip, paymentMethod === method.name && styles.chipActivePayment]}
              onPress={() => setPaymentMethod(method.name)}
              onLongPress={() => handleOpenEditModal('edit_payment', method)}
            >
              <Text
                style={[
                  styles.chipText,
                  paymentMethod === method.name && styles.chipTextActive,
                ]}
              >
                {PAYMENT_EMOJIS[method.name] || '🏦'} {method.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.chipAdd}
            onPress={() => handleOpenAddModal('add_payment')}
          >
            <Ionicons name="add" size={16} color="#aaa" />
            <Text style={styles.chipAddText}>New</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity style={styles.submitButton} onPress={handleAdd}>
          <Ionicons name="add-circle" size={22} color="#000" />
          <Text style={styles.submitButtonText}>Add Expense</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType.startsWith('add') ? 'Add New' : 'Edit'} {modalType.includes('category') ? 'Category' : 'Payment Method'}
            </Text>

            <TextInput
              style={styles.modalInput}
              value={modalInputValue}
              onChangeText={setModalInputValue}
              placeholder="Enter name..."
              placeholderTextColor="#666"
              autoFocus
            />

            <View style={styles.modalActions}>
              {modalType.startsWith('edit') && (
                <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleDeleteItem}>
                  <Ionicons name="trash" size={20} color="#CF6679" />
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleSaveModal}>
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  chipAdd: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chipAddText: {
    fontSize: 13,
    color: '#aaa',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalDeleteBtn: {
    padding: 8,
  },
  modalBtnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalBtnCancelText: {
    color: '#ccc',
    fontSize: 16,
  },
  modalBtnSave: {
    backgroundColor: '#FFB74D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalBtnSaveText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
