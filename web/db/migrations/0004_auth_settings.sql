-- 0004_auth_settings.sql — local auth (swap for Supabase Auth later), settings, extras
alter table users add column password_hash text;

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index on sessions (user_id);

create table settings (
  key text primary key,
  value text not null
);
insert into settings (key, value) values
  ('default_commission_bps', '1200'),
  ('return_window_days', '7'),
  ('shipping_base_paise', '6000'),
  ('shipping_per_500g_paise', '3000'),
  ('free_shipping_over_paise', '0');

create table newsletter_subscribers (
  email text primary key,
  created_at timestamptz not null default now()
);

create table collections (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  active boolean not null default true
);
create table collection_products (
  collection_id uuid not null references collections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (collection_id, product_id)
);

alter table seller_suborders add column tracking_note text;
alter table seller_suborders add column rejected_reason text;
