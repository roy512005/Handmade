-- 0003_rls_supabase.sql — Row-level security. SUPABASE-SPECIFIC (uses auth.uid()).
-- Server code uses the service role (bypasses RLS) for admin work and enforces RBAC itself;
-- RLS is the safety net for anything reachable with the anon/authenticated keys.

create or replace function is_admin() returns boolean language sql stable security definer as $$
  select exists (select 1 from user_roles where user_id = auth.uid()
    and role in ('super_admin','operations_manager','product_manager','customer_support','finance_manager'));
$$;

create or replace function my_seller_id() returns uuid language sql stable security definer as $$
  select id from seller_profiles where user_id = auth.uid();
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'users','user_roles','buyer_profiles','seller_profiles','seller_documents','seller_bank_accounts','addresses',
    'categories','products','product_images','product_variants','product_inventory',
    'carts','cart_items','wishlists','wishlist_items','coupons',
    'parent_orders','seller_suborders','order_items','payments','payment_events','shipments','shipment_events',
    'commissions','settlements','seller_ledger_entries','return_requests','refunds','coupon_redemptions',
    'reviews','notifications','support_tickets','banners','homepage_sections','audit_logs']
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;
-- With RLS on and no policy, a table is deny-all. Tables without policies below
-- (payment_events, audit_logs, commissions, coupons, coupon_redemptions, user_roles writes…)
-- are service-role only.

-- Public catalogue
create policy cat_read on categories for select using (active);
create policy banners_read on banners for select using (active);
create policy sections_read on homepage_sections for select using (active);
create policy sellers_public on seller_profiles for select using (status = 'approved' or user_id = auth.uid() or is_admin());
create policy products_public on products for select using (
  (status = 'approved' and exists (select 1 from seller_profiles s where s.id = seller_id and s.status = 'approved'))
  or seller_id = my_seller_id() or is_admin());
create policy images_public on product_images for select using (exists (select 1 from products p where p.id = product_id));
create policy variants_public on product_variants for select using (exists (select 1 from products p where p.id = product_id));
create policy reviews_public on reviews for select using (status = 'published' or user_id = auth.uid() or is_admin());

-- Seller manages own products (approval status changes happen server-side)
create policy products_seller_ins on products for insert with check (seller_id = my_seller_id() and status in ('draft','pending_approval'));
create policy products_seller_upd on products for update using (seller_id = my_seller_id()) with check (seller_id = my_seller_id() and status in ('draft','pending_approval','paused','archived'));

-- Private seller data: owner + admin only
create policy docs_owner on seller_documents for all using (seller_id = my_seller_id() or is_admin()) with check (seller_id = my_seller_id());
create policy bank_owner on seller_bank_accounts for select using (seller_id = my_seller_id() or is_admin());

-- Buyer-owned data
create policy me_user on users for select using (id = auth.uid() or is_admin());
create policy me_roles on user_roles for select using (user_id = auth.uid() or is_admin());
create policy me_buyer on buyer_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy me_addr on addresses for all using (user_id = auth.uid() or seller_id = my_seller_id() or is_admin())
  with check (user_id = auth.uid() or seller_id = my_seller_id());
create policy me_cart on carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy me_cart_items on cart_items for all using (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy me_wish on wishlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy me_wish_items on wishlist_items for all using (exists (select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));
create policy me_notif on notifications for select using (user_id = auth.uid());
create policy me_notif_upd on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy me_tickets on support_tickets for select using (user_id = auth.uid() or is_admin());
create policy me_review_ins on reviews for insert with check (
  user_id = auth.uid() and exists (
    select 1 from order_items oi join seller_suborders so on so.id = oi.suborder_id
    join parent_orders po on po.id = so.parent_order_id
    where oi.id = order_item_id and po.buyer_id = auth.uid() and so.status = 'delivered'));

-- Orders: buyer sees own; seller sees own suborders
create policy orders_buyer on parent_orders for select using (buyer_id = auth.uid() or is_admin());
create policy subs_visible on seller_suborders for select using (
  seller_id = my_seller_id() or is_admin()
  or exists (select 1 from parent_orders po where po.id = parent_order_id and po.buyer_id = auth.uid()));
create policy items_visible on order_items for select using (exists (select 1 from seller_suborders so where so.id = suborder_id));
create policy ship_visible on shipments for select using (exists (select 1 from seller_suborders so where so.id = suborder_id));
create policy shipev_visible on shipment_events for select using (exists (select 1 from shipments s where s.id = shipment_id));
create policy pay_buyer on payments for select using (exists (select 1 from parent_orders po where po.id = parent_order_id and po.buyer_id = auth.uid()) or is_admin());
create policy returns_visible on return_requests for select using (requested_by = auth.uid() or exists (select 1 from seller_suborders so where so.id = suborder_id and so.seller_id = my_seller_id()) or is_admin());
create policy refunds_visible on refunds for select using (is_admin() or exists (select 1 from payments p join parent_orders po on po.id = p.parent_order_id where p.id = payment_id and po.buyer_id = auth.uid()));

-- Seller money: read-only for owner; all writes go through server code
create policy ledger_owner on seller_ledger_entries for select using (seller_id = my_seller_id() or is_admin());
create policy settle_owner on settlements for select using (seller_id = my_seller_id() or is_admin());
