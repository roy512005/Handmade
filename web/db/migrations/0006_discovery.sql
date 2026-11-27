-- 0006_discovery.sql — editorial discovery, follows, moodboards, preferences
alter table products add column moods text[] not null default '{}';
alter table products add column one_of_a_kind boolean not null default false;
alter table products add column process_note text;
create index on products using gin (moods);

alter table product_images add column width integer;
alter table product_images add column height integer;

alter table seller_profiles add column location text;
alter table seller_profiles add column craft text;
alter table seller_profiles add column tagline text;

alter table wishlist_items add column price_at_save bigint;

alter table collections add column kind text not null default 'curated' check (kind in ('curated','drop'));
alter table collections add column created_at timestamptz not null default now();

create table follows (
  user_id uuid not null references users(id) on delete cascade,
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, seller_id)
);
create index on follows (seller_id);

create table moodboards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);
create index on moodboards (user_id);

create table moodboard_items (
  board_id uuid not null references moodboards(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (board_id, product_id)
);

-- Defaults: alerts about things you saved/followed are on; promotional drops are opt-in.
create table notification_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  wishlist_alerts boolean not null default true,
  followed_artisans boolean not null default true,
  weekly_drops boolean not null default false,
  order_updates boolean not null default true
);
