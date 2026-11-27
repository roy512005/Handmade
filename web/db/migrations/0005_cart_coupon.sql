-- 0005_cart_coupon.sql
alter table carts add column coupon_code text;
alter table seller_suborders add column cancelled_by text;
create index on seller_suborders (status);
create index on products (featured) where featured;
