-- Migration 007: Create FINE table
CREATE TABLE IF NOT EXISTS public.fine (
  fine_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_id INTEGER NOT NULL UNIQUE REFERENCES public.book_transaction(transaction_id) ON DELETE RESTRICT,
  fine_amount NUMERIC(10, 2) NOT NULL CHECK (fine_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending'))
);

CREATE INDEX IF NOT EXISTS idx_fine_payment_status ON public.fine (payment_status);

ALTER TABLE public.fine ENABLE ROW LEVEL SECURITY;
