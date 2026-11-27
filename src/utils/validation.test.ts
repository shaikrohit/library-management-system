import { describe, expect, it } from 'vitest';
import {
  isDueDateValid,
  isReturnDateValid,
  isValidEmail,
  isValidIsbn,
  isValidYear,
} from './validation';

describe('validation utilities', () => {
  it('validates ISBN strings', () => {
    expect(isValidIsbn('978-0-13-468599-1')).toBe(true);
    expect(isValidIsbn('0134685997')).toBe(true);
    expect(isValidIsbn('12')).toBe(false);
    expect(isValidIsbn('bad isbn!')).toBe(false);
  });

  it('validates email addresses', () => {
    expect(isValidEmail('rohit@mits.ac.in')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
  });

  it('validates publication year bounds', () => {
    expect(isValidYear(2024)).toBe(true);
    expect(isValidYear(null)).toBe(true);
    expect(isValidYear(1200)).toBe(false);
  });

  it('validates issue, due, and return date ordering', () => {
    expect(isDueDateValid('2026-01-01', '2026-01-10')).toBe(true);
    expect(isDueDateValid('2026-01-10', '2026-01-05')).toBe(false);
    expect(isReturnDateValid('2026-01-01', '2026-01-01')).toBe(true);
    expect(isReturnDateValid('2026-01-10', '2026-01-09')).toBe(false);
  });
});
