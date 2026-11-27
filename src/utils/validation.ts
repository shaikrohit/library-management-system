export function isValidIsbn(isbn: string): boolean {
  const cleaned = isbn.trim();
  return cleaned.length >= 4 && cleaned.length <= 20 && /^[0-9Xx-]+$/.test(cleaned);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidYear(year: number | null): boolean {
  if (year === null) return true;
  const maxYear = new Date().getFullYear() + 1;
  return Number.isInteger(year) && year >= 1450 && year <= maxYear;
}

export function isDueDateValid(issueDate: string, dueDate: string): boolean {
  if (!issueDate || !dueDate) return false;
  return dueDate >= issueDate;
}

export function isReturnDateValid(issueDate: string, returnDate: string): boolean {
  if (!issueDate || !returnDate) return false;
  return returnDate >= issueDate;
}
