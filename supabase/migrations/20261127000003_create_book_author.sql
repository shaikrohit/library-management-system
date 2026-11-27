-- Migration 003: Create BOOK_AUTHOR associative table (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.book_author (
  isbn VARCHAR(20) NOT NULL REFERENCES public.book(isbn) ON DELETE CASCADE ON UPDATE CASCADE,
  author_id INTEGER NOT NULL REFERENCES public.author(author_id) ON DELETE RESTRICT,
  PRIMARY KEY (isbn, author_id)
);

CREATE INDEX IF NOT EXISTS idx_book_author_author_id ON public.book_author (author_id);

ALTER TABLE public.book_author ENABLE ROW LEVEL SECURITY;
