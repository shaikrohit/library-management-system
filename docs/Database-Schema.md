# Database Schema & Constraints — Library Management System

**Database Engine:** Supabase PostgreSQL 17  
**Security:** Row Level Security (RLS) enabled on every table + `SECURITY DEFINER` PL/pgSQL stored procedures.

---

## 1. Principal & Supporting Tables

| # | Table | Purpose | Primary Key |
|---|---|---|---|
| 1 | `public.author` | Stores library book authors | `author_id` |
| 2 | `public.book` | Stores unique books keyed by ISBN | `isbn` |
| 3 | `public.book_author` | Resolves `M:N` relationship between `book` and `author` | `(isbn, author_id)` |
| 4 | `public.member` | Stores registered library members (`Student` / `Staff`) | `member_id` |
| 5 | `public.app_user` | Links Supabase Auth (`auth.users`) to application roles (`ADMIN` / `MEMBER`) | `user_id` |
| 6 | `public.book_transaction` | Tracks book issue, due, and return dates | `transaction_id` |
| 7 | `public.fine` | Tracks overdue fines (₹5/day) and payment status (`Paid` / `Pending`) | `fine_id` |
| 8 | `public.app_setup_config` | Private table storing SHA-256 hash of one-time admin bootstrap token | `id` |

---

## 2. Table Creation DDL

```sql
CREATE TABLE public.author (
  author_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0)
);

CREATE TABLE public.book (
  isbn VARCHAR(20) PRIMARY KEY CHECK (char_length(trim(isbn)) > 0),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  publisher TEXT,
  publication_year INTEGER CHECK (
    publication_year IS NULL
    OR (publication_year >= 1450 AND publication_year <= 2100)
  )
);

CREATE TABLE public.book_author (
  isbn VARCHAR(20) NOT NULL REFERENCES public.book(isbn) ON DELETE CASCADE ON UPDATE CASCADE,
  author_id INTEGER NOT NULL REFERENCES public.author(author_id) ON DELETE RESTRICT,
  PRIMARY KEY (isbn, author_id)
);

CREATE TABLE public.member (
  member_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  email TEXT NOT NULL UNIQUE CHECK (char_length(trim(email)) > 0),
  phone TEXT,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('Student', 'Staff'))
);

CREATE TABLE public.app_user (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MEMBER')),
  member_id INTEGER UNIQUE REFERENCES public.member(member_id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_app_user_role_member CHECK (
    (role = 'ADMIN' AND member_id IS NULL)
    OR (role = 'MEMBER' AND member_id IS NOT NULL)
  )
);

CREATE TABLE public.book_transaction (
  transaction_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  isbn VARCHAR(20) NOT NULL REFERENCES public.book(isbn) ON DELETE RESTRICT ON UPDATE CASCADE,
  member_id INTEGER NOT NULL REFERENCES public.member(member_id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE NULL,
  CONSTRAINT chk_transaction_due_after_issue CHECK (due_date >= issue_date),
  CONSTRAINT chk_transaction_return_after_issue CHECK (return_date IS NULL OR return_date >= issue_date)
);

-- Prevents the same ISBN from being actively issued more than once concurrently
CREATE UNIQUE INDEX idx_book_transaction_active_isbn
  ON public.book_transaction (isbn)
  WHERE return_date IS NULL;

CREATE TABLE public.fine (
  fine_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id INTEGER NOT NULL UNIQUE REFERENCES public.book_transaction(transaction_id) ON DELETE RESTRICT,
  fine_amount NUMERIC(10, 2) NOT NULL CHECK (fine_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending'))
);
```

---

## 3. Stored Procedures (RPCs) & Atomic Fine Logic

- `public.issue_book(p_isbn, p_member_id, p_issue_date, p_due_date)` — Verifies `ADMIN` role, locks the `book` row (`FOR UPDATE`), checks availability (`return_date IS NULL`), validates dates, and inserts into `book_transaction`.
- `public.return_book(p_transaction_id, p_return_date)` — Verifies `ADMIN` role, locks the active transaction (`FOR UPDATE`), validates `return_date >= issue_date`, updates `return_date`, and if `return_date > due_date`, atomically computes `(return_date - due_date) * 5` and inserts a `Pending` row into `public.fine` in the same PostgreSQL transaction.
- `public.mark_fine_paid(p_fine_id)` — Verifies `ADMIN` role and updates `payment_status` from `'Pending'` to `'Paid'`.
- `public.save_book(...)` — Verifies `ADMIN` role and atomically upserts `book` and synchronizes `book_author` links.
- `public.handle_new_user()` — Trigger on `auth.users` insert; creates the corresponding `member` record and `app_user` row with hardcoded `role = 'MEMBER'`.
