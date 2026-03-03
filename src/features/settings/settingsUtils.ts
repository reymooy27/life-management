export const ACTIVITY_LEVELS = [
  { label: 'Sedentary (little/no exercise)', value: 'Sedentary', multiplier: 1.2 },
  { label: 'Lightly active (1-3 days/week)', value: 'Lightly active', multiplier: 1.375 },
  { label: 'Moderately active (3-5 days/week)', value: 'Moderately active', multiplier: 1.55 },
  { label: 'Very active (6-7 days/week)', value: 'Very active', multiplier: 1.725 },
  { label: 'Super active (physical job)', value: 'Super active', multiplier: 1.9 },
] as const;

export type ActivityLevel = typeof ACTIVITY_LEVELS[number]['value'];

/**
 * Calculates age in years from a birthdate string (YYYY-MM-DD)
 */
export function calculateAge(birthdate: string): number {
  if (!birthdate) return 0;
  const today = new Date();
  const birthDate = new Date(birthdate);

  if (isNaN(birthDate.getTime())) return 0;

  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * Calculates Basal Metabolic Rate using the Mifflin-St Jeor Equation
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'Male' | 'Female'
): number {
  if (!weightKg || !heightCm || !age || !gender) return 0;

  // Mifflin-St Jeor Equation
  let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;

  if (gender === 'Male') {
    bmr += 5;
  } else {
    bmr -= 161;
  }

  return Math.round(bmr);
}

/**
 * Calculates Total Daily Energy Expenditure
 */
export function calculateTDEE(bmr: number, activityLevel: string): number {
  if (!bmr || !activityLevel) return 0;

  const level = ACTIVITY_LEVELS.find(l => l.value === activityLevel);
  if (!level) return bmr; // Fallback to BMR if unknown level

  return Math.round(bmr * level.multiplier);
}

/**
 * Validates weight/height input strings
 * Returns a valid positive number or null
 */
export function validateMeasurement(value: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const num = Number(trimmed);
  if (isNaN(num) || num <= 0) return null;

  return num;
}
