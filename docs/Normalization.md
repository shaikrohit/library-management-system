# Database Normalization Analysis — Library Management System

This document analyzes the implemented PostgreSQL schema against **1NF, 2NF, 3NF, and BCNF** using actual functional dependencies (FDs) and candidate keys.

---

## 1. Functional Dependencies & Candidate Keys by Relation

### 1.1 `AUTHOR (author_id, name)`
- **Candidate Key:** `{author_id}`
- **Functional Dependencies:** `author_id -> name`
- **Analysis:** Atomic attributes (1NF); single-column PK eliminates partial dependencies (2NF); no transitive dependencies among non-key attributes (3NF); every determinant (`author_id`) is a superkey (**BCNF**).

### 1.2 `BOOK (isbn, title, publisher, publication_year)`
- **Candidate Key:** `{isbn}`
- **Functional Dependencies:** `isbn -> title, publisher, publication_year`
- **Analysis:** Atomic values (1NF); no repeating author groups since authors were extracted to `AUTHOR` + `BOOK_AUTHOR`; single-column PK ensures 2NF; `publisher` and `publication_year` depend directly on `isbn` rather than each other (3NF); every determinant is a superkey (**BCNF**).

### 1.3 `BOOK_AUTHOR (isbn, author_id)`
- **Candidate Key:** `{isbn, author_id}`
- **Functional Dependencies:** Only trivial FDs (`{isbn, author_id} -> {isbn, author_id}`).
- **Analysis:** All-key junction relation with atomic columns. Satisfies 1NF, 2NF, 3NF, and **BCNF**.

### 1.4 `MEMBER (member_id, name, email, phone, membership_type)`
- **Candidate Keys:** `{member_id}`, `{email}` (due to `UNIQUE(email)`).
- **Functional Dependencies:**
  - `member_id -> name, email, phone, membership_type`
  - `email -> member_id, name, phone, membership_type`
- **Analysis:** Single-valued attributes (1NF); every non-prime attribute is fully dependent on both candidate keys (2NF); no transitive dependency between `name`, `phone`, and `membership_type` (3NF); both determinants (`member_id` and `email`) are candidate keys/superkeys (**BCNF**).

### 1.5 `APP_USER (user_id, email, role, member_id, created_at)`
- **Candidate Keys:** `{user_id}`, `{email}`, and `{member_id}` (for non-null member rows via `UNIQUE(member_id)`).
- **Functional Dependencies:** `user_id -> email, role, member_id, created_at`; `email -> user_id, role, member_id, created_at`.
- **Analysis:** Note that `email` mirrors the login email in `auth.users` / `member`. Within `APP_USER`, every determinant (`user_id`, `email`) is a candidate key, satisfying **BCNF**.

### 1.6 `BOOK_TRANSACTION (transaction_id, isbn, member_id, issue_date, due_date, return_date)`
- **Candidate Key:** `{transaction_id}`
- **Functional Dependencies:** `transaction_id -> isbn, member_id, issue_date, due_date, return_date`
- **Analysis:** Note that `book_availability` is **not** stored as a redundant attribute (which would create a derived-data update anomaly); instead availability is derived from `NOT EXISTS (return_date IS NULL)`. All attributes are atomic (1NF); single-attribute PK guarantees 2NF; `isbn`, `member_id`, and dates depend solely on `transaction_id` (3NF & **BCNF**).

### 1.7 `FINE (fine_id, transaction_id, fine_amount, payment_status)`
- **Candidate Keys:** `{fine_id}`, `{transaction_id}` (via `UNIQUE(transaction_id)`).
- **Functional Dependencies:**
  - `fine_id -> transaction_id, fine_amount, payment_status`
  - `transaction_id -> fine_id, fine_amount, payment_status`
- **Analysis:** Note that `fine_amount` is materialized upon book return (`(return_date - due_date) * 5`) so historical fine rates remain immutable even if future policy changes. Within `FINE`, every determinant (`fine_id`, `transaction_id`) is a superkey, satisfying 1NF, 2NF, 3NF, and **BCNF**.

---

## 2. Normal Form Summary Table

| Table | 1NF | 2NF | 3NF | BCNF | Notes |
|---|---|---|---|---|---|
| `AUTHOR` | Yes | Yes | Yes | Yes | Single PK `{author_id}` |
| `BOOK` | Yes | Yes | Yes | Yes | Authors separated into `BOOK_AUTHOR` |
| `BOOK_AUTHOR` | Yes | Yes | Yes | Yes | All-key associative table |
| `MEMBER` | Yes | Yes | Yes | Yes | `{member_id}` and `{email}` are both candidate keys |
| `APP_USER` | Yes | Yes | Yes | Yes | Links Supabase Auth UUID to role & member |
| `BOOK_TRANSACTION` | Yes | Yes | Yes | Yes | Availability derived dynamically (no redundant flag) |
| `FINE` | Yes | Yes | Yes | Yes | `1:0..1` with `BOOK_TRANSACTION` via `UNIQUE(transaction_id)` |
