import {
    calculateAge,
    calculateBMR,
    calculateTDEE,
    validateMeasurement,
} from '../settingsUtils';

describe('calculateAge', () => {
  beforeAll(() => {
    // Mock system time to ensure tests don't fail as time passes
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-03'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('calculates correct age before birthday this year', () => {
    // Born June 1, 1990 — hasn't had birthday yet in March 2026
    expect(calculateAge('1990-06-01')).toBe(35);
  });

  it('calculates correct age after birthday this year', () => {
    // Born Jan 1, 1990 — already had birthday in March 2026
    expect(calculateAge('1990-01-01')).toBe(36);
  });

  it('returns 0 for invalid date string', () => {
    expect(calculateAge('invalid-date')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(calculateAge('')).toBe(0);
  });

  it('handles leap years correctly', () => {
    // Born Feb 29, 2000
    expect(calculateAge('2000-02-29')).toBe(26);
  });
});

describe('calculateBMR', () => {
  it('calculates Male BMR correctly (Mifflin-St Jeor)', () => {
    // 10 * 80 + 6.25 * 180 - 5 * 30 + 5
    // 800 + 1125 - 150 + 5 = 1780
    expect(calculateBMR(80, 180, 30, 'Male')).toBe(1780);
  });

  it('calculates Female BMR correctly (Mifflin-St Jeor)', () => {
    // 10 * 65 + 6.25 * 165 - 5 * 25 - 161
    // 650 + 1031.25 - 125 - 161 = 1395.25 -> rounded = 1395
    expect(calculateBMR(65, 165, 25, 'Female')).toBe(1395);
  });

  it('returns 0 if any missing parameter', () => {
    expect(calculateBMR(0, 180, 30, 'Male')).toBe(0);
    expect(calculateBMR(80, 0, 30, 'Male')).toBe(0);
    expect(calculateBMR(80, 180, 0, 'Male')).toBe(0);
  });
});

describe('calculateTDEE', () => {
  it('calculates correctly for Sedentary', () => {
    expect(calculateTDEE(2000, 'Sedentary')).toBe(2400); // 2000 * 1.2
  });

  it('calculates correctly for Super active', () => {
    expect(calculateTDEE(2000, 'Super active')).toBe(3800); // 2000 * 1.9
  });

  it('returns BMR if activity level not found', () => {
    expect(calculateTDEE(2000, 'Unknown')).toBe(2000);
  });

  it('returns 0 if BMR is 0', () => {
    expect(calculateTDEE(0, 'Sedentary')).toBe(0);
  });
});

describe('validateMeasurement', () => {
  it('returns number for valid integer', () => {
    expect(validateMeasurement('75')).toBe(75);
  });

  it('returns number for valid decimal', () => {
    expect(validateMeasurement('75.5')).toBe(75.5);
  });

  it('returns null for empty string', () => {
    expect(validateMeasurement('')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(validateMeasurement('0')).toBeNull();
  });

  it('returns null for negative number', () => {
    expect(validateMeasurement('-10')).toBeNull();
  });

  it('returns null for non-numeric string', () => {
    expect(validateMeasurement('abc')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(validateMeasurement('  80.2  ')).toBe(80.2);
  });
});
