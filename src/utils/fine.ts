export const FINE_RATE_PER_DAY = 5;

/**
 * Computes overdue calendar days and fine amount at ₹5 per day.
 * Matches PostgreSQL return_book() calculation: GREATEST(0, return_date - due_date) * 5.
 */
export function calculateOverdueFine(
  dueDateStr: string,
  returnDateStr: string
): { overdueDays: number; fineAmount: number } {
  const due = parseIsoDateUtc(dueDateStr);
  const ret = parseIsoDateUtc(returnDateStr);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((ret.getTime() - due.getTime()) / msPerDay);
  const overdueDays = Math.max(0, diffDays);
  const fineAmount = overdueDays * FINE_RATE_PER_DAY;

  return { overdueDays, fineAmount };
}

function parseIsoDateUtc(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) {
    throw new Error(`Invalid ISO date string: ${dateStr}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return new Date(Date.UTC(year, month, day));
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(dateStr: string, days: number): string {
  const date = parseIsoDateUtc(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function formatCurrencyInr(amount: number | string): string {
  const num = typeof amount === 'string' ? Number(amount) : amount;
  return `₹${Number.isFinite(num) ? num.toFixed(0) : '0'}`;
}
