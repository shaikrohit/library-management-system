-- Migration 001: Create AUTHOR table and Row Level Security
CREATE TABLE IF NOT EXISTS public.author (
  author_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_author_name ON public.author (name);

ALTER TABLE public.author ENABLE ROW LEVEL SECURITY;
