# Testing Results — Library Management System

**Project:** Library Management System  
**Production URL:** https://mits-library-management-system.netlify.app  
**Database:** Supabase PostgreSQL 17 (`qmsibpoedmxzfvoesnph`)  
**Frontend Build:** Vite 6 + TypeScript 5.7  

---

## 1. Automated Unit Tests (Vitest)

Executed via `npm test` (`vitest run`):

| Test Suite | Tests | Result | Coverage |
|---|---|---|---|
| `src/utils/fine.test.ts` | 6 | Passed | ₹0 on due date, ₹0 before due date, ₹5 (1 day), ₹15 (3 days), ₹50 (10 days), INR formatting |
| `src/utils/validation.test.ts` | 4 | Passed | ISBN format, email format, publication year bounds, issue/due/return date ordering |
| **Total** | **10** | **10/10 Passed** | — |

---

## 2. Production TypeScript & Vite Build

Executed via `npm run build` (`tsc -b && vite build`):
- TypeScript strict compilation (`noUnusedLocals`, `noUnusedParameters`, `strict: true`): **Passed (0 errors)**
- Vite production bundle (`dist/index.html`, CSS, JS): **Passed**

---

## 3. PostgreSQL Schema, Constraints, Atomicity & RPC Verification

Verified directly against the live Supabase PostgreSQL 17 database (`qmsibpoedmxzfvoesnph`) inside rolled-back verification blocks (`execute_sql`):

| Test Category | Scenario Tested | Outcome |
|---|---|---|
| **Schema & RLS** | All 7 principal/supporting tables (`author`, `book`, `book_author`, `member`, `app_user`, `book_transaction`, `fine`) created with RLS enabled | Passed |
| **Sample Data** | Idempotent seed of 5 books, 6 authors, and 6 `book_author` links | Passed |
| **Date Constraint** | Inserting `due_date < issue_date` rejected by `chk_transaction_due_after_issue` | Passed |
| **Double-Issue Prevention** | Partial unique index `idx_book_transaction_active_isbn` rejects issuing an already-issued ISBN | Passed |
| **Member Deletion Guard** | Foreign key `ON DELETE RESTRICT` prevents deleting a member with transaction history | Passed |
| **Fine Case 1 (0 days)** | `return_book()` with `2026-01-10` due / `2026-01-10` return -> ₹0, no `fine` row created | Passed |
| **Fine Case 2 (1 day)** | `return_book()` with `2026-01-10` due / `2026-01-11` return -> ₹5 (`Pending`) | Passed |
| **Fine Case 3 (3 days)** | `return_book()` with `2026-01-10` due / `2026-01-13` return -> ₹15 (`Pending`) | Passed |
| **Fine Case 4 (10 days)** | `return_book()` with `2026-01-10` due / `2026-01-20` return -> ₹50 (`Pending`) | Passed |
| **Duplicate Fine Guard** | Inserting a second `fine` row for the same `transaction_id` blocked by `UNIQUE(transaction_id)` | Passed |
| **Fine Settlement** | `mark_fine_paid()` transitions `Pending` -> `Paid` for Administrator role | Passed |
| **Authorization** | Member role rejected when invoking `issue_book()`; Anonymous caller rejected when invoking `get_admin_dashboard_stats()` | Passed |
| **Signup Trigger** | Live `supabase.auth.signUp()` created `member` and `app_user` (`role = 'MEMBER'`) records | Passed |

---

## 4. Production Deployment & Live Connectivity Checks

Verified against `https://mits-library-management-system.netlify.app`:

| Check | Result |
|---|---|
| **SPA Routes (`200 OK`)** | `/`, `/login/member`, `/login/admin`, `/register`, `/admin-setup` all return HTTP 200 |
| **Frontend Env Vars** | Production JS bundle contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and does not contain `service_role` |
| **Live Anonymous RLS** | `@supabase/supabase-js` anonymous queries return 0 rows on `book`/`member` and `permission denied` on `get_admin_dashboard_stats()` |
| **Live Bootstrap Check** | `has_admin()` RPC returns `false` before initial administrator setup |
