-- Migration 006: Create BOOK_TRANSACTION table and partial unique index for active issues
CREATE TABLE IF NOT EXISTS public.book_transaction (
  transaction_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  isbn VARCHAR(20) NOT NULL REFERENCES public.book(isbn) ON DELETE RESTRICT ON UPDATE CASCADE,
  member_id INTEGER NOT NULL REFERENCES public.member(member_id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE NULL,
  CONSTRAINT chk_transaction_due_after_issue CHECK (due_date >= issue_date),
  CONSTRAINT chk_transaction_return_after_issue CHECK (return_date IS NULL OR return_date >= issue_date)
);

-- Enforce one active issue per ISBN at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_transaction_active_isbn
  ON public.book_transaction (isbn)
  WHERE return_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_book_transaction_member_id ON public.book_transaction (member_id);
CREATE INDEX IF NOT EXISTS idx_book_transaction_due_date ON public.book_transaction (due_date);

ALTER TABLE public.book_transaction ENABLE ROW LEVEL SECURITY;
