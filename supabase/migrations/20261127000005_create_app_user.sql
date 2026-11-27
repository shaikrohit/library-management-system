-- Migration 005: Create APP_USER and private setup configuration tables
CREATE TABLE IF NOT EXISTS public.app_user (
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

CREATE INDEX IF NOT EXISTS idx_app_user_role ON public.app_user (role);

ALTER TABLE public.app_user ENABLE ROW LEVEL SECURITY;

-- Private table storing SHA-256 hash of one-time admin setup token (no RLS policies = inaccessible to API)
CREATE TABLE IF NOT EXISTS public.app_setup_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_setup_config ENABLE ROW LEVEL SECURITY;
