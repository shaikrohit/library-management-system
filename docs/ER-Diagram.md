# Entity-Relationship (ER) Modeling — Library Management System

**Student:** Shaik Rohit (`26MLA08010`)  
**Institution:** Madanapalle Institute of Technology & Science (MITS)  
**Department:** Computer Science and Engineering (Cyber Security)  
**Subject:** Database Concepts and Application Laboratory  

---

## 1. Entity-Relationship Diagram

```mermaid
erDiagram
    AUTHOR {
        int author_id PK "GENERATED ALWAYS AS IDENTITY"
        text name "NOT NULL"
    }

    BOOK {
        varchar isbn PK "VARCHAR(20), NOT NULL"
        text title "NOT NULL"
        text publisher "NULLABLE"
        int publication_year "CHECK (1450..2100)"
    }

    BOOK_AUTHOR {
        varchar isbn PK,FK "References BOOK(isbn)"
        int author_id PK,FK "References AUTHOR(author_id)"
    }

    MEMBER {
        int member_id PK "GENERATED ALWAYS AS IDENTITY"
        text name "NOT NULL"
        text email UK "UNIQUE, NOT NULL"
        text phone "NULLABLE"
        text membership_type "CHECK ('Student' | 'Staff')"
    }

    APP_USER {
        uuid user_id PK,FK "References auth.users(id)"
        text email UK "UNIQUE, NOT NULL"
        text role "CHECK ('ADMIN' | 'MEMBER')"
        int member_id UK,FK "NULLABLE, References MEMBER(member_id)"
        timestamptz created_at "DEFAULT now()"
    }

    BOOK_TRANSACTION {
        int transaction_id PK "GENERATED ALWAYS AS IDENTITY"
        varchar isbn FK "References BOOK(isbn)"
        int member_id FK "References MEMBER(member_id)"
        date issue_date "NOT NULL"
        date due_date "NOT NULL, >= issue_date"
        date return_date "NULL until returned"
    }

    FINE {
        int fine_id PK "GENERATED ALWAYS AS IDENTITY"
        int transaction_id UK,FK "UNIQUE, References BOOK_TRANSACTION(transaction_id)"
        numeric fine_amount "NUMERIC(10,2), >= 0"
        text payment_status "CHECK ('Paid' | 'Pending')"
    }

    BOOK ||--|{ BOOK_AUTHOR : "authored via"
    AUTHOR ||--o{ BOOK_AUTHOR : "writes"
    BOOK ||--o{ BOOK_TRANSACTION : "borrowed in"
    MEMBER ||--o{ BOOK_TRANSACTION : "initiates"
    MEMBER ||--o| APP_USER : "authenticated by"
    BOOK_TRANSACTION ||--o| FINE : "generates"
```

---

## 2. Entities & Cardinalities

| Relationship | Entities | Cardinality | Business Rule |
|---|---|---|---|
| **Writes** | `AUTHOR` — `BOOK` (via `BOOK_AUTHOR`) | Many-to-Many (`M:N`) | A book can have multiple authors; an author can write multiple books. Resolved using composite PK `(isbn, author_id)`. |
| **Borrowed In** | `BOOK` — `BOOK_TRANSACTION` | One-to-Many (`1:N`) | A book can appear in multiple historical transactions, but a PostgreSQL partial unique index restricts it to at most **one active** (`return_date IS NULL`) transaction at a time. |
| **Borrows** | `MEMBER` — `BOOK_TRANSACTION` | One-to-Many (`1:N`) | A registered member can borrow multiple books over time. |
| **Authenticated By** | `MEMBER` — `APP_USER` | One-to-Zero-or-One (`1:0..1`) | Each `MEMBER` login maps to one `APP_USER` row (`role = 'MEMBER'`), whereas `ADMIN` rows have `member_id IS NULL`. |
| **Generates** | `BOOK_TRANSACTION` — `FINE` | One-to-Zero-or-One (`1:0..1`) | An overdue return (`return_date > due_date`) automatically generates at most one fine record (`UNIQUE(transaction_id)`) at ₹5/day. |
