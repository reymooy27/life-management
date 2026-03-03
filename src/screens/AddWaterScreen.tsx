import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import {
    WaterPresetRow,
    addWaterEntry,
    addWaterPreset,
    deleteWaterPreset,
    getWaterPresets,
} from '../db/database';
import { RootStackParamList } from '../types/navigation';

export default function AddWaterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [presets, setPresets] = useState<WaterPresetRow[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetAmount, setNewPresetAmount] = useState('');

  const loadPresets = useCallback(async () => {
    try {
      const data = await getWaterPresets();
      setPresets(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPresets();
    }, [loadPresets])
  );

  const handleSelectPreset = async (preset: WaterPresetRow) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().slice(0, 5); // HH:MM
      await addWaterEntry(preset.amount_ml, preset.name, today, time);
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not log water entry');
    }
  };

  const handleDeletePreset = (id: number, name: string) => {
    Alert.alert('Delete Custom Preset', `Are you sure you want to remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWaterPreset(id);
          loadPresets();
        },
      },
    ]);
  };

  const handleSaveCustomPreset = async () => {
    const name = newPresetName.trim();
    const amount = Number(newPresetAmount.trim());

    if (!name) {
      Alert.alert('Validation Error', 'Please enter a name for the preset.');
      return;
    }
    if (!amount || amount <= 0 || !Number.isInteger(amount)) {
      Alert.alert('Validation Error', 'Please enter a valid whole number for the amount in ml.');
      return;
    }

    try {
      await addWaterPreset(name, amount);
      setIsModalVisible(false);
      setNewPresetName('');
      setNewPresetAmount('');
      loadPresets();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not save preset.');
    }
  };

  const renderPreset = ({ item }: { item: WaterPresetRow }) => (
    <TouchableOpacity
      style={styles.presetCard}
      onPress={() => handleSelectPreset(item)}
      onLongPress={() => handleDeletePreset(item.id, item.name)}
    >
      <View style={styles.presetIcon}>
        <Ionicons name="water" size={32} color="#2196F3" />
      </View>
      <Text style={styles.presetName}>{item.name}</Text>
      <Text style={styles.presetAmount}>{item.amount_ml} ml</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.instructions}>
        Tap to quick-add, or long-press to delete a custom preset.
      </Text>

      <FlatList
        data={presets}
        keyExtractor={item => item.id.toString()}
        renderItem={renderPreset}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={styles.addCustomBtn}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add" size={24} color="#000" />
        <Text style={styles.addCustomText}>Create Custom Size</Text>
      </TouchableOpacity>

      {/* Add Custom Preset Modal */}
      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Preset</Text>

            <Text style={styles.label}>Name (e.g. Aqua 1.5l)</Text>
            <TextInput
              style={styles.input}
              placeholder="Preset Name"
              placeholderTextColor="#666"
              value={newPresetName}
              onChangeText={setNewPresetName}
            />

            <Text style={styles.label}>Amount in ml</Text>
            <TextInput
              style={styles.input}
              placeholder="1500"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={newPresetAmount}
              onChangeText={setNewPresetAmount}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSave}
                onPress={handleSaveCustomPreset}
              >
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
  instructions: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 24,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetCard: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    marginHorizontal: 8,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  presetIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  presetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  presetAmount: {
    fontSize: 14,
    color: '#aaa',
  },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    marginHorizontal: 24,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addCustomText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 12,
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
    backgroundColor: '#2196F3',
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
