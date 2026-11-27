-- 0002_orders_money.sql — orders, payments, shipments, ledger, refunds, engagement, ops

-- ───────── Orders ─────────
create sequence order_number_seq start 1001;

create table parent_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default ('ORD-' || nextval('order_number_seq')),
  buyer_id uuid references users(id),
  idempotency_key text unique not null,               -- one checkout attempt = one order
  shipping_address jsonb not null,                    -- snapshot at purchase time
  subtotal_paise bigint not null check (subtotal_paise >= 0),
  shipping_paise bigint not null default 0 check (shipping_paise >= 0),
  discount_paise bigint not null default 0 check (discount_paise >= 0),
  total_paise bigint not null check (total_paise >= 0),
  coupon_id uuid references coupons(id),
  status text not null default 'placed' check (status in ('placed','payment_confirmed','cancelled','completed','refunded')),
  created_at timestamptz not null default now()
);
create index on parent_orders (buyer_id, created_at desc);

create table seller_suborders (
  id uuid primary key default gen_random_uuid(),
  parent_order_id uuid not null references parent_orders(id),
  seller_id uuid not null references seller_profiles(id),
  suborder_number text unique not null,               -- SUB-1001-A
  subtotal_paise bigint not null check (subtotal_paise >= 0),
  shipping_paise bigint not null default 0,
  discount_paise bigint not null default 0,
  status text not null default 'placed' check (status in (
    'placed','payment_confirmed','accepted','preparing','ready_for_pickup','picked_up',
    'in_transit','out_for_delivery','delivered','delivery_failed',
    'cancellation_requested','cancelled','return_requested','return_in_progress','refunded')),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  unique (parent_order_id, seller_id)
);
create index on seller_suborders (seller_id, status);
create index on seller_suborders (parent_order_id);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  suborder_id uuid not null references seller_suborders(id),
  product_id uuid not null references products(id),
  variant_id uuid not null references product_variants(id),
  title_snapshot text not null,
  unit_price_paise bigint not null check (unit_price_paise >= 0),   -- price snapshot
  quantity integer not null check (quantity > 0)
);
create index on order_items (suborder_id);

-- ───────── Payments ─────────
create table payments (
  id uuid primary key default gen_random_uuid(),
  parent_order_id uuid not null references parent_orders(id),
  provider text not null,
  provider_payment_id text unique,                    -- idempotency anchor for webhooks
  amount_paise bigint not null check (amount_paise > 0),
  status text not null default 'created' check (status in ('created','authorized','captured','failed','refunded','partially_refunded')),
  method text,
  created_at timestamptz not null default now()
);
create index on payments (parent_order_id);

create table payment_events (                          -- raw, append-only webhook log
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payment_id uuid references payments(id),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)                -- replay-safe
);

-- ───────── Shipping ─────────
create table shipments (
  id uuid primary key default gen_random_uuid(),
  suborder_id uuid unique not null references seller_suborders(id),
  courier text, awb text unique, label_url text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create table shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  provider_event_id text,
  status text not null,
  location text,
  payload jsonb,
  occurred_at timestamptz not null,
  unique (shipment_id, provider_event_id)
);

-- ───────── Money: commission, ledger, settlements, refunds ─────────
create table commissions (
  id uuid primary key default gen_random_uuid(),
  suborder_id uuid unique not null references seller_suborders(id),
  rate_bps integer not null check (rate_bps between 0 and 10000),   -- rate frozen at order time
  base_paise bigint not null,
  amount_paise bigint not null check (amount_paise >= 0)
);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles(id),
  amount_paise bigint not null check (amount_paise > 0),
  status text not null default 'initiated' check (status in ('initiated','paid','failed')),
  provider_ref text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Append-only. Corrections are new rows. Signed amounts: credits +, debits −.
create table seller_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references seller_profiles(id),
  suborder_id uuid references seller_suborders(id),
  settlement_id uuid references settlements(id),
  entry_type text not null check (entry_type in ('sale','commission','shipping_adjustment','refund_reversal','commission_reversal','adjustment','settlement_payout')),
  amount_paise bigint not null,
  status text not null default 'pending' check (status in ('pending','available','settled')),
  reference text,
  created_at timestamptz not null default now()
);
create index on seller_ledger_entries (seller_id, status);
create index on seller_ledger_entries (suborder_id);

create or replace function ledger_immutable() returns trigger as $$
begin
  if tg_op = 'DELETE' then raise exception 'ledger entries are append-only'; end if;
  -- only status/settlement_id may change as entries move pending → available → settled
  if new.seller_id <> old.seller_id or new.amount_paise <> old.amount_paise
     or new.entry_type <> old.entry_type or new.suborder_id is distinct from old.suborder_id then
    raise exception 'ledger amounts are immutable; add a correcting entry';
  end if;
  return new;
end; $$ language plpgsql;
create trigger trg_ledger_immutable before update or delete on seller_ledger_entries
  for each row execute function ledger_immutable();

create table return_requests (
  id uuid primary key default gen_random_uuid(),
  suborder_id uuid not null references seller_suborders(id),
  requested_by uuid not null references users(id),
  reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','rejected','in_progress','completed')),
  created_at timestamptz not null default now()
);

create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id),
  suborder_id uuid references seller_suborders(id),
  return_request_id uuid references return_requests(id),
  amount_paise bigint not null check (amount_paise > 0),
  status text not null default 'initiated' check (status in ('initiated','processed','failed')),
  provider_ref text,
  approved_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id),
  user_id uuid not null references users(id),
  parent_order_id uuid unique not null references parent_orders(id),
  discount_paise bigint not null,
  created_at timestamptz not null default now()
);
create index on coupon_redemptions (coupon_id, user_id);

-- ───────── Engagement ─────────
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references users(id),
  order_item_id uuid unique not null references order_items(id),  -- verified purchase, one review per item
  rating smallint not null check (rating between 1 and 5),
  body text,
  photos text[] not null default '{}',
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now()
);
create index on reviews (product_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  dedupe_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read_at, created_at desc);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  parent_order_id uuid references parent_orders(id),
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  created_at timestamptz not null default now()
);

-- ───────── Content / ops ─────────
create table banners (
  id uuid primary key default gen_random_uuid(),
  title text, image_url text not null, link_url text,
  position integer not null default 0, active boolean not null default true
);
create table homepage_sections (
  id uuid primary key default gen_random_uuid(),
  kind text not null, title text,
  config jsonb not null default '{}',
  position integer not null default 0, active boolean not null default true
);
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  action text not null,
  target_type text not null, target_id uuid,
  before jsonb, after jsonb, ip inet,
  created_at timestamptz not null default now()
);
create index on audit_logs (target_type, target_id);
create index on audit_logs (actor_id, created_at desc);
