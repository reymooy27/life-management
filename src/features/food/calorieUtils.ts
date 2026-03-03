import { FoodEntryRow } from '../../db/database';

export interface ExerciseCalorieEntry {
  calories_burned: number;
}

/**
 * Sum total calories from an array of food entries.
 */
export function calculateDailyCalories(entries: Pick<FoodEntryRow, 'calories'>[]): number {
  return entries.reduce((sum, entry) => sum + entry.calories, 0);
}

/**
 * Net calories = consumed (food) − burned (exercise).
 */
export function calculateNetCalories(
  foodEntries: Pick<FoodEntryRow, 'calories'>[],
  exerciseEntries: ExerciseCalorieEntry[]
): number {
  const consumed = calculateDailyCalories(foodEntries);
  const burned = exerciseEntries.reduce((sum, e) => sum + e.calories_burned, 0);
  return consumed - burned;
}

/**
 * Calculate total macronutrients from a list of food entries.
 */
export function calculateDailyMacros(entries: Pick<FoodEntryRow, 'protein' | 'carbs' | 'fats'>[]) {
  return entries.reduce(
    (totals, entry) => {
      totals.protein += entry.protein || 0;
      totals.carbs += entry.carbs || 0;
      totals.fats += entry.fats || 0;
      return totals;
    },
    { protein: 0, carbs: 0, fats: 0 }
  );
}

/**
 * Validate a string as a positive integer calorie value.
 * Returns the parsed number, or null if invalid.
 */
export function validateCalorieInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0 || !Number.isInteger(num)) return null;
  return num;
}
