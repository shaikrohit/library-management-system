import { describe, expect, it } from 'vitest';
import { calculateOverdueFine, formatCurrencyInr } from './fine';

describe('calculateOverdueFine (₹5 per overdue calendar day)', () => {
  it('charges ₹0 when returned on the due date (10 Jan -> 10 Jan)', () => {
    expect(calculateOverdueFine('2026-01-10', '2026-01-10')).toEqual({
      overdueDays: 0,
      fineAmount: 0,
    });
  });

  it('charges ₹0 when returned before the due date (10 Jan -> 08 Jan)', () => {
    expect(calculateOverdueFine('2026-01-10', '2026-01-08')).toEqual({
      overdueDays: 0,
      fineAmount: 0,
    });
  });

  it('charges ₹5 when returned 1 day late (10 Jan -> 11 Jan)', () => {
    expect(calculateOverdueFine('2026-01-10', '2026-01-11')).toEqual({
      overdueDays: 1,
      fineAmount: 5,
    });
  });

  it('charges ₹15 when returned 3 days late (10 Jan -> 13 Jan)', () => {
    expect(calculateOverdueFine('2026-01-10', '2026-01-13')).toEqual({
      overdueDays: 3,
      fineAmount: 15,
    });
  });

  it('charges ₹50 when returned 10 days late (10 Jan -> 20 Jan)', () => {
    expect(calculateOverdueFine('2026-01-10', '2026-01-20')).toEqual({
      overdueDays: 10,
      fineAmount: 50,
    });
  });

  it('formats INR currency properly', () => {
    expect(formatCurrencyInr(50)).toBe('₹50');
    expect(formatCurrencyInr('15.00')).toBe('₹15');
  });
});
