import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('lifeflow.db');
  await initializeTables(db);
  return db;
}

async function initializeTables(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS food_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories INTEGER NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL
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
  `);

  // Migration: add payment_method column if it doesn't exist
  try {
    await database.runAsync(
      "ALTER TABLE expense_entries ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'Cash'"
    );
  } catch {
    // Column already exists — ignore
  }
}

// ── Food CRUD ──

export interface FoodEntryRow {
  id: number;
  name: string;
  calories: number;
  date: string;
  time: string;
}

export async function addFoodEntry(
  name: string,
  calories: number,
  date: string,
  time: string
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO food_entries (name, calories, date, time) VALUES (?, ?, ?, ?)',
    [name, calories, date, time]
  );
}

export async function getFoodEntries(date: string): Promise<FoodEntryRow[]> {
  const database = await getDatabase();
  return await database.getAllAsync<FoodEntryRow>(
    'SELECT * FROM food_entries WHERE date = ? ORDER BY id DESC',
    [date]
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
