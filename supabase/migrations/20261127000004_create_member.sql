-- Migration 004: Create MEMBER table
CREATE TABLE IF NOT EXISTS public.member (
  member_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(trim(name)) > 0),
  email TEXT NOT NULL UNIQUE CHECK (char_length(trim(email)) > 0),
  phone TEXT,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('Student', 'Staff'))
);

CREATE INDEX IF NOT EXISTS idx_member_name ON public.member (name);

ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;
