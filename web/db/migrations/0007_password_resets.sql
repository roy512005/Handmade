-- 0007_password_resets.sql — single-use, expiring reset tokens (only the hash is stored)
create table password_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index on password_resets (user_id);
-- deny-all under Supabase: only server code may touch reset tokens
alter table password_resets enable row level security;
