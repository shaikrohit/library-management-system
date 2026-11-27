export type UserRole = 'ADMIN' | 'MEMBER';
export type MembershipType = 'Student' | 'Staff';
export type PaymentStatus = 'Paid' | 'Pending';

export interface Author {
  author_id: number;
  name: string;
}

export interface Book {
  isbn: string;
  title: string;
  publisher: string | null;
  publication_year: number | null;
}

export interface BookCatalogItem extends Book {
  is_issued: boolean;
  authors: Author[];
}

export interface Member {
  member_id: number;
  name: string;
  email: string;
  phone: string | null;
  membership_type: MembershipType;
}

export interface AppUser {
  user_id: string;
  email: string;
  role: UserRole;
  member_id: number | null;
  created_at: string;
}

export interface BookTransaction {
  transaction_id: number;
  isbn: string;
  member_id: number;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  book?: Book | null;
  member?: Member | null;
  fine?: Fine | null;
}

export interface Fine {
  fine_id: number;
  transaction_id: number;
  fine_amount: number;
  payment_status: PaymentStatus;
  book_transaction?: {
    transaction_id: number;
    isbn: string;
    member_id: number;
    issue_date: string;
    due_date: string;
    return_date: string | null;
    book?: Book | null;
    member?: Member | null;
  } | null;
}

export interface AdminDashboardStats {
  total_books: number;
  total_authors: number;
  total_members: number;
  currently_issued: number;
  overdue_books: number;
  pending_fine_amount: number;
  paid_fine_amount: number;
  total_transactions: number;
}

export interface MemberDashboardStats {
  active_borrows: number;
  overdue_borrows: number;
  total_borrows: number;
  pending_fine_amount: number;
  paid_fine_amount: number;
}
