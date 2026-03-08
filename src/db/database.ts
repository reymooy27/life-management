import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('lifeflow.db');
      await initializeTables(database);
      db = database;
      return database;
    })();
  }
  return dbPromise;
}

async function initializeTables(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS food_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Snack',
      protein INTEGER NOT NULL DEFAULT 0,
      carbs INTEGER NOT NULL DEFAULT 0,
      fats INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS exercise_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      calories_burned INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash'
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      weight_kg REAL,
      height_cm REAL,
      birthdate TEXT,
      gender TEXT,
      activity_level TEXT
    );

    CREATE TABLE IF NOT EXISTS expense_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS water_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount_ml INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS water_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount_ml INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS portfolio_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      asset_type TEXT NOT NULL DEFAULT 'crypto',
      buy_price REAL NOT NULL,
      quantity REAL NOT NULL,
      current_price REAL NOT NULL DEFAULT 0,
      date_added TEXT NOT NULL,
      notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      total_value_usd REAL NOT NULL DEFAULT 0
    );
  `);

  // Seed default expense categories if empty
  try {
    const categoriesCount = await database.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM expense_categories');
    if (categoriesCount?.count === 0) {
      const defaultCategories = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];
      for (const cat of defaultCategories) {
        await database.runAsync('INSERT INTO expense_categories (name) VALUES (?)', [cat]);
      }
    }
  } catch (e) {
    console.error('Error seeding default categories', e);
  }

  // Seed default payment methods if empty
  try {
    const paymentMethodsCount = await database.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM payment_methods');
    if (paymentMethodsCount?.count === 0) {
      const defaultMethods = ['Cash', 'Debit', 'Credit'];
      for (const method of defaultMethods) {
        await database.runAsync('INSERT INTO payment_methods (name) VALUES (?)', [method]);
      }
    }
  } catch (e) {
    console.error('Error seeding default payment methods', e);
  }

  // Seed default water presets if empty
  try {
    const waterPresetsCount = await database.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM water_presets');
    if (waterPresetsCount?.count === 0) {
      const defaultPresets = [
        { name: 'Glass', amount_ml: 250 },
        { name: 'Bottle', amount_ml: 500 },
        { name: 'Large Bottle', amount_ml: 750 },
      ];
      for (const preset of defaultPresets) {
        await database.runAsync('INSERT INTO water_presets (name, amount_ml) VALUES (?, ?)', [preset.name, preset.amount_ml]);
      }
    }
  } catch (e) {
    console.error('Error seeding water presets', e);
  }

  // Migration: add payment_method column if it doesn't exist
  try {
    await database.runAsync(
      "ALTER TABLE expense_entries ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Cash'"
    );
  } catch {
    // Column already exists — ignore
  }

  // Migration: add category and macro columns to food_entries
  try {
    await database.runAsync(
      "ALTER TABLE food_entries ADD COLUMN category TEXT NOT NULL DEFAULT 'Snack'"
    );
    await database.runAsync(
      "ALTER TABLE food_entries ADD COLUMN protein INTEGER NOT NULL DEFAULT 0"
    );
    await database.runAsync(
      "ALTER TABLE food_entries ADD COLUMN carbs INTEGER NOT NULL DEFAULT 0"
    );
    await database.runAsync(
      "ALTER TABLE food_entries ADD COLUMN fats INTEGER NOT NULL DEFAULT 0"
    );
  } catch {
    // Columns already exist — ignore
  }

  // Migration: add water_goal_ml column if it doesn't exist
  try {
    await database.runAsync(
      "ALTER TABLE user_settings ADD COLUMN water_goal_ml INTEGER NOT NULL DEFAULT 2500"
    );
  } catch {
    // Column already exists — ignore
  }

  // Migration: add notifications settings
  try {
    await database.runAsync(
      "ALTER TABLE user_settings ADD COLUMN water_notif_enabled INTEGER NOT NULL DEFAULT 0"
    );
    await database.runAsync(
      "ALTER TABLE user_settings ADD COLUMN water_notif_interval_hours REAL NOT NULL DEFAULT 2"
    );
    await database.runAsync(
      "ALTER TABLE user_settings ADD COLUMN exercise_morning_notif_enabled INTEGER NOT NULL DEFAULT 0"
    );
    await database.runAsync(
      "ALTER TABLE user_settings ADD COLUMN exercise_afternoon_notif_enabled INTEGER NOT NULL DEFAULT 0"
    );
  } catch {
    // Columns already exist — ignore
  }
}

// ── Food CRUD ──

export interface FoodEntryRow {
  id: number;
  name: string;
  calories: number;
  date: string;
  time: string;
  category: string;
  protein: number;
  carbs: number;
  fats: number;
}

export async function addFoodEntry(
  name: string,
  calories: number,
  category: string = 'Snack',
  protein: number = 0,
  carbs: number = 0,
  fats: number = 0,
  date: string,
  time: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO food_entries (name, calories, category, protein, carbs, fats, date, time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, calories, category, protein, carbs, fats, date, time]
  );
}

export async function updateFoodEntry(
  id: number,
  name: string,
  calories: number,
  category: string,
  protein: number,
  carbs: number,
  fats: number
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE food_entries SET name = ?, calories = ?, category = ?, protein = ?, carbs = ?, fats = ? WHERE id = ?',
    [name, calories, category, protein, carbs, fats, id]
  );
}

export async function getFoodEntries(date: string): Promise<FoodEntryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<FoodEntryRow>(
    'SELECT * FROM food_entries WHERE date = ? ORDER BY id DESC',
    [date]
  );
}

export async function getRecentFoods(limit = 10): Promise<FoodEntryRow[]> {
  const database = await getDatabase();
  // Group by name to get unique foods, ordered by most recently added
  return await database.getAllAsync<FoodEntryRow>(
    'SELECT * FROM food_entries GROUP BY name ORDER BY MAX(id) DESC LIMIT ?',
    [limit]
  );
}

export async function deleteFoodEntry(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM food_entries WHERE id = ?', [id]);
}

// ── Exercise CRUD ──

export interface ExerciseEntryRow {
  id: number;
  name: string;
  duration_minutes: number;
  calories_burned: number;
  date: string;
  time: string;
}

export async function addExerciseEntry(
  name: string,
  durationMinutes: number,
  caloriesBurned: number,
  date: string,
  time: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO exercise_entries (name, duration_minutes, calories_burned, date, time) VALUES (?, ?, ?, ?, ?)',
    [name, durationMinutes, caloriesBurned, date, time]
  );
}

export async function updateExerciseEntry(
  id: number,
  name: string,
  durationMinutes: number,
  caloriesBurned: number
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE exercise_entries SET name = ?, duration_minutes = ?, calories_burned = ? WHERE id = ?',
    [name, durationMinutes, caloriesBurned, id]
  );
}

export async function getExerciseEntries(date: string): Promise<ExerciseEntryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<ExerciseEntryRow>(
    'SELECT * FROM exercise_entries WHERE date = ? ORDER BY id DESC',
    [date]
  );
}

export async function deleteExerciseEntry(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM exercise_entries WHERE id = ?', [id]);
}

// ── Expense CRUD ──

export interface ExpenseEntryRow {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  payment_method: string;
}

export async function addExpense(
  description: string,
  amount: number,
  category: string,
  date: string,
  paymentMethod: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO expense_entries (description, amount, category, date, payment_method) VALUES (?, ?, ?, ?, ?)',
    [description, amount, category, date, paymentMethod]
  );
}

export async function updateExpense(
  id: number,
  description: string,
  amount: number,
  category: string,
  paymentMethod: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE expense_entries SET description = ?, amount = ?, category = ?, payment_method = ? WHERE id = ?',
    [description, amount, category, paymentMethod, id]
  );
}

export async function getExpenses(date: string): Promise<ExpenseEntryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<ExpenseEntryRow>(
    'SELECT * FROM expense_entries WHERE date = ? ORDER BY id DESC',
    [date]
  );
}

export async function getMonthlyExpenses(yearMonth: string): Promise<ExpenseEntryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<ExpenseEntryRow>(
    "SELECT * FROM expense_entries WHERE date LIKE ? || '%' ORDER BY date DESC, id DESC",
    [yearMonth]
  );
}

export async function deleteExpense(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM expense_entries WHERE id = ?', [id]);
}

export async function getYearlyExpenses(year: number): Promise<ExpenseEntryRow[]> {
  const database = await getDatabase();
  const prefix = `${year}-`;
  return await database.getAllAsync<ExpenseEntryRow>(
    "SELECT * FROM expense_entries WHERE date LIKE ? || '%' ORDER BY date DESC, id DESC",
    [prefix]
  );
}

// ── User Settings CRUD ──

export interface UserSettings {
  id: number;
  weight_kg: number | null;
  height_cm: number | null;
  birthdate: string | null;
  gender: string | null;
  activity_level: string | null;
  water_goal_ml: number | null;
  water_notif_enabled?: number;
  water_notif_interval_hours?: number;
  exercise_morning_notif_enabled?: number;
  exercise_afternoon_notif_enabled?: number;
}

export async function getUserSettings(): Promise<UserSettings | null> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<UserSettings>(
    'SELECT * FROM user_settings WHERE id = 1'
  );
  return result;
}

export async function saveUserSettings(
  settings: Omit<UserSettings, 'id'>
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO user_settings (
       id, weight_kg, height_cm, birthdate, gender, activity_level, water_goal_ml,
       water_notif_enabled, water_notif_interval_hours, exercise_morning_notif_enabled, exercise_afternoon_notif_enabled
     )
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      settings.weight_kg ?? null,
      settings.height_cm ?? null,
      settings.birthdate ?? null,
      settings.gender ?? null,
      settings.activity_level ?? null,
      settings.water_goal_ml ?? 2500,
      settings.water_notif_enabled ?? 0,
      settings.water_notif_interval_hours ?? 2,
      settings.exercise_morning_notif_enabled ?? 0,
      settings.exercise_afternoon_notif_enabled ?? 0,
    ]
  );
}

// ── Custom Expense Categories CRUD ──

export interface CustomCategoryRow {
  id: number;
  name: string;
}

export async function getExpenseCategories(): Promise<CustomCategoryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<CustomCategoryRow>(
    'SELECT * FROM expense_categories ORDER BY id ASC'
  );
}

export async function addExpenseCategory(name: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO expense_categories (name) VALUES (?)', [name]);
}

export async function updateExpenseCategory(oldName: string, newName: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE expense_categories SET name = ? WHERE name = ?', [newName, oldName]);
  // Cascade update expenses
  await database.runAsync('UPDATE expense_entries SET category = ? WHERE category = ?', [newName, oldName]);
}

export async function deleteExpenseCategory(name: string): Promise<void> {
  const database = await getDatabase();
  const usageCount = await database.getFirstAsync<{count: number}>(
    'SELECT COUNT(*) as count FROM expense_entries WHERE category = ?',
    [name]
  );
  if ((usageCount?.count ?? 0) > 0) {
    throw new Error('Cannot delete this category because it is being used in your expenses.');
  }
  await database.runAsync('DELETE FROM expense_categories WHERE name = ?', [name]);
}

// ── Custom Payment Methods CRUD ──

export interface CustomPaymentMethodRow {
  id: number;
  name: string;
}

export async function getPaymentMethods(): Promise<CustomPaymentMethodRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<CustomPaymentMethodRow>(
    'SELECT * FROM payment_methods ORDER BY id ASC'
  );
}

export async function addPaymentMethod(name: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('INSERT INTO payment_methods (name) VALUES (?)', [name]);
}

export async function updatePaymentMethod(oldName: string, newName: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('UPDATE payment_methods SET name = ? WHERE name = ?', [newName, oldName]);
  // Cascade update expenses
  await database.runAsync('UPDATE expense_entries SET payment_method = ? WHERE payment_method = ?', [newName, oldName]);
}

export async function deletePaymentMethod(name: string): Promise<void> {
  const database = await getDatabase();
  const usageCount = await database.getFirstAsync<{count: number}>(
    'SELECT COUNT(*) as count FROM expense_entries WHERE payment_method = ?',
    [name]
  );
  if ((usageCount?.count ?? 0) > 0) {
    throw new Error('Cannot delete this payment method because it is being used in your expenses.');
  }
  await database.runAsync('DELETE FROM payment_methods WHERE name = ?', [name]);
}

// ── Water CRUD ──

export interface WaterEntryRow {
  id: number;
  amount_ml: number;
  name: string;
  date: string;
  time: string;
}

export async function addWaterEntry(
  amountMl: number,
  name: string,
  date: string,
  time: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO water_entries (amount_ml, name, date, time) VALUES (?, ?, ?, ?)',
    [amountMl, name, date, time]
  );
}

export async function getWaterEntries(date: string): Promise<WaterEntryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<WaterEntryRow>(
    'SELECT * FROM water_entries WHERE date = ? ORDER BY id DESC',
    [date]
  );
}

export async function deleteWaterEntry(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM water_entries WHERE id = ?', [id]);
}

// ── Water Presets CRUD ──

export interface WaterPresetRow {
  id: number;
  name: string;
  amount_ml: number;
}

export async function getWaterPresets(): Promise<WaterPresetRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<WaterPresetRow>(
    'SELECT * FROM water_presets ORDER BY amount_ml ASC'
  );
}

export async function addWaterPreset(name: string, amountMl: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO water_presets (name, amount_ml) VALUES (?, ?)',
    [name, amountMl]
  );
}

export async function deleteWaterPreset(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM water_presets WHERE id = ?', [id]);
}

// ── Portfolio CRUD ──

export interface PortfolioEntryRow {
  id: number;
  asset_name: string;
  ticker: string;
  asset_type: string;
  buy_price: number;
  quantity: number;
  current_price: number;
  date_added: string;
  notes: string;
}

export async function addPortfolioEntry(
  assetName: string,
  ticker: string,
  assetType: string,
  buyPrice: number,
  quantity: number,
  dateAdded: string,
  notes: string = ''
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO portfolio_entries (asset_name, ticker, asset_type, buy_price, quantity, date_added, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [assetName, ticker.toUpperCase(), assetType, buyPrice, quantity, dateAdded, notes]
  );
}

export async function updatePortfolioEntry(
  id: number,
  buyPrice: number,
  quantity: number,
  dateAdded: string,
  notes: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE portfolio_entries SET buy_price = ?, quantity = ?, date_added = ?, notes = ? WHERE id = ?',
    [buyPrice, quantity, dateAdded, notes, id]
  );
}

export async function getPortfolioEntries(): Promise<PortfolioEntryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<PortfolioEntryRow>(
    'SELECT * FROM portfolio_entries ORDER BY id DESC'
  );
}

export async function deletePortfolioEntry(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM portfolio_entries WHERE id = ?', [id]);
}

export async function updatePortfolioEntryPrice(id: number, currentPrice: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE portfolio_entries SET current_price = ? WHERE id = ?',
    [currentPrice, id]
  );
}

export async function updatePortfolioEntryPriceByTicker(ticker: string, assetType: string, currentPrice: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE portfolio_entries SET current_price = ? WHERE UPPER(ticker) = UPPER(?) AND asset_type = ?',
    [currentPrice, ticker, assetType]
  );
}

// ── Portfolio Snapshots ──

export interface PortfolioSnapshotRow {
  id: number;
  date: string;
  total_value_usd: number;
}

export async function savePortfolioSnapshot(date: string, totalValueUsd: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO portfolio_snapshots (date, total_value_usd) VALUES (?, ?)',
    [date, totalValueUsd]
  );
}

export async function getPortfolioSnapshots(limit = 30): Promise<PortfolioSnapshotRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<PortfolioSnapshotRow>(
    'SELECT * FROM portfolio_snapshots ORDER BY date ASC LIMIT ?',
    [limit]
  );
}

export async function getTransactionHistoryForAsset(ticker: string, assetType: string): Promise<PortfolioEntryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<PortfolioEntryRow>(
    'SELECT * FROM portfolio_entries WHERE UPPER(ticker) = UPPER(?) AND asset_type = ? ORDER BY date_added DESC, id DESC',
    [ticker, assetType]
  );
}


export interface WaterHistoryRow {
  date: string;
  total_ml: number;
}

export async function getWaterHistory(days: number): Promise<WaterHistoryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<WaterHistoryRow>(
    'SELECT date, SUM(amount_ml) as total_ml FROM water_entries GROUP BY date ORDER BY date DESC LIMIT ?', [days]
  );
}
