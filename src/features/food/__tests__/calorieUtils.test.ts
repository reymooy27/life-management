import {
    calculateDailyCalories,
    calculateNetCalories,
    validateCalorieInput,
} from '../calorieUtils';

describe('calculateDailyCalories', () => {
  it('returns 0 for empty array', () => {
    expect(calculateDailyCalories([])).toBe(0);
  });

  it('sums calories from multiple entries', () => {
    const entries = [{ calories: 200 }, { calories: 350 }, { calories: 150 }];
    expect(calculateDailyCalories(entries)).toBe(700);
  });

  it('handles single entry', () => {
    expect(calculateDailyCalories([{ calories: 500 }])).toBe(500);
  });
});

describe('calculateNetCalories', () => {
  it('returns consumed minus burned', () => {
    const food = [{ calories: 500 }, { calories: 300 }];
    const exercise = [{ calories_burned: 200 }];
    expect(calculateNetCalories(food, exercise)).toBe(600);
  });

  it('returns negative if more burned than consumed', () => {
    const food = [{ calories: 100 }];
    const exercise = [{ calories_burned: 300 }];
    expect(calculateNetCalories(food, exercise)).toBe(-200);
  });

  it('handles empty arrays', () => {
    expect(calculateNetCalories([], [])).toBe(0);
  });

  it('handles only food entries', () => {
    expect(calculateNetCalories([{ calories: 400 }], [])).toBe(400);
  });

  it('handles only exercise entries', () => {
    expect(calculateNetCalories([], [{ calories_burned: 250 }])).toBe(-250);
  });
});

describe('validateCalorieInput', () => {
  it('returns number for valid integer string', () => {
    expect(validateCalorieInput('250')).toBe(250);
  });

  it('returns 0 for "0"', () => {
    expect(validateCalorieInput('0')).toBe(0);
  });

  it('returns null for empty string', () => {
    expect(validateCalorieInput('')).toBeNull();
  });

  it('returns null for negative number', () => {
    expect(validateCalorieInput('-10')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(validateCalorieInput('abc')).toBeNull();
  });

  it('returns null for float', () => {
    expect(validateCalorieInput('12.5')).toBeNull();
  });

  it('trims whitespace before validation', () => {
    expect(validateCalorieInput('  300  ')).toBe(300);
  });
});
