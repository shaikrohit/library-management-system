-- Migration 002: Create BOOK table and Row Level Security
CREATE TABLE IF NOT EXISTS public.book (
  isbn VARCHAR(20) PRIMARY KEY CHECK (char_length(trim(isbn)) > 0),
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  publisher TEXT,
  publication_year INTEGER CHECK (
    publication_year IS NULL
    OR (publication_year >= 1450 AND publication_year <= 2100)
  )
);

CREATE INDEX IF NOT EXISTS idx_book_title ON public.book (title);
CREATE INDEX IF NOT EXISTS idx_book_publisher ON public.book (publisher);

ALTER TABLE public.book ENABLE ROW LEVEL SECURITY;
