-- 0001_core.sql — identity, catalogue, shopping
-- Conventions: uuid PKs, timestamptz, money as bigint paise (INR), status via CHECK.


create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ───────── Identity ─────────
create table users (
  id uuid primary key default gen_random_uuid(),   -- with Supabase: matches auth.users.id
  email text unique not null,
  phone text,
  full_name text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('buyer','seller','super_admin','operations_manager','product_manager','customer_support','finance_manager')),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table buyer_profiles (
  user_id uuid primary key references users(id) on delete cascade,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade,
  brand_name text not null,
  slug text unique not null,
  seller_type text not null check (seller_type in ('individual_artisan','handmade_creator','small_business','registered_business')),
  status text not null default 'pending' check (status in ('pending','under_review','approved','rejected','suspended')),
  story text,
  profile_image_url text,
  pan_last4 text,                       -- store full PAN only encrypted / in vault
  commission_bps integer check (commission_bps between 0 and 10000), -- null = use default
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on seller_profiles (status);

-- Private: owner + admin only (see RLS)
create table seller_documents (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles(id) on delete cascade,
  doc_type text not null,               -- pan, id_proof, business_proof, bank_proof
  storage_path text not null,           -- private bucket, never a public URL
  created_at timestamptz not null default now()
);
create index on seller_documents (seller_id);

create table seller_bank_accounts (
  seller_id uuid primary key references seller_profiles(id) on delete cascade,
  account_holder text not null,
  account_last4 text not null,
  ifsc text not null,
  provider_ref text,                    -- gateway fund-account id; full number not stored here
  created_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  seller_id uuid references seller_profiles(id) on delete cascade,
  kind text not null default 'shipping' check (kind in ('shipping','pickup','business')),
  name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  check ((user_id is not null) <> (seller_id is not null))
);
create index on addresses (user_id);
create index on addresses (seller_id);

-- ───────── Catalogue ─────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort_order integer not null default 0,
  active boolean not null default true
);

create table products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles(id),
  category_id uuid not null references categories(id),
  title text not null,
  description text,
  materials text[] not null default '{}',
  price_paise bigint not null check (price_paise >= 0),
  original_price_paise bigint check (original_price_paise is null or original_price_paise >= price_paise),
  weight_grams integer check (weight_grams > 0),
  length_mm integer, width_mm integer, height_mm integer,
  processing_days integer not null default 3 check (processing_days >= 0),
  is_custom boolean not null default false,
  custom_options jsonb,
  status text not null default 'draft' check (status in ('draft','pending_approval','approved','rejected','paused','archived')),
  featured boolean not null default false,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on products (status, category_id, created_at desc);
create index on products (seller_id);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text,
  position integer not null default 0
);
create index on product_images (product_id, position);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text unique,
  label text not null,                  -- e.g. "Indigo / Large"
  price_paise bigint check (price_paise >= 0),   -- null = product price
  active boolean not null default true
);
create index on product_variants (product_id);

create table product_inventory (
  variant_id uuid primary key references product_variants(id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  check (reserved <= on_hand)
);

-- ───────── Shopping ─────────
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete cascade,
  guest_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_token is not null)
);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  variant_id uuid not null references product_variants(id),
  quantity integer not null check (quantity > 0),
  saved_for_later boolean not null default false,
  unique (cart_id, variant_id)
);

create table wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references users(id) on delete cascade
);
create table wishlist_items (
  wishlist_id uuid not null references wishlists(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  kind text not null check (kind in ('percent','fixed','first_order')),
  value integer not null check (value > 0),       -- percent, or paise for fixed
  min_order_paise bigint not null default 0,
  max_discount_paise bigint,
  usage_limit integer,
  per_user_limit integer not null default 1,
  category_id uuid references categories(id),
  seller_id uuid references seller_profiles(id),
  starts_at timestamptz, ends_at timestamptz,
  active boolean not null default true
);

create trigger trg_users_upd before update on users for each row execute function set_updated_at();
create trigger trg_sellers_upd before update on seller_profiles for each row execute function set_updated_at();
create trigger trg_products_upd before update on products for each row execute function set_updated_at();
create trigger trg_carts_upd before update on carts for each row execute function set_updated_at();
