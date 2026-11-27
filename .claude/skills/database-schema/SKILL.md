---
name: database-schema
description: PostgreSQL entities, conventions, indexes and row-level security for the marketplace. Use when writing migrations or queries.
---

# Database Schema

## Conventions
- UUID primary keys (`gen_random_uuid()`), `created_at`/`updated_at` timestamptz.
- Money as `bigint` paise, with currency fixed to INR for now.
- Enums or check constraints for statuses; soft-delete/archive where history matters.
- Foreign keys everywhere; index every FK and every common filter/sort column.
- Migrations in `/db/migrations`, versioned, reversible when possible.

## Entities
**Identity:** users, user_roles, buyer_profiles, seller_profiles, seller_documents, seller_addresses, addresses
**Catalogue:** categories, products, product_images, product_variants, product_inventory
**Shopping:** carts, cart_items, wishlists, wishlist_items, coupons, coupon_redemptions
**Orders:** parent_orders, seller_suborders, order_items
**Money:** payments, payment_events, commissions, seller_ledger_entries, settlements, refunds, return_requests
**Logistics:** shipments, shipment_events
**Engagement:** reviews, notifications, support_tickets
**Content/ops:** homepage_sections, banners, audit_logs

## Suggested indexes
products(status, category_id, created_at), products(seller_id), full-text/trigram on products.title and seller brand name, seller_suborders(seller_id, status), parent_orders(buyer_id, created_at), payments(provider_payment_id) UNIQUE, shipments(awb) UNIQUE, seller_ledger_entries(seller_id, status), coupons(code) UNIQUE.

## Row-level security
- Buyers: own carts, addresses, orders, reviews.
- Sellers: own products, suborders, ledger; fulfilment-only buyer fields.
- Public: approved products/sellers, approved reviews.
- seller_documents and bank details: owner + admin only.
- Admin access via server with role checks; service key never in client.

## Integrity
Unique (product_id, user_id, order_item_id) for reviews; check stock ≥ 0; coupon redemption uniqueness per user/order; ledger entries immutable (no UPDATE/DELETE grants).
