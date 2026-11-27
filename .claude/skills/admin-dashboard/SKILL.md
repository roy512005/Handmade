---
name: admin-dashboard
description: Admin control centre — seller/product/order/customer management, coupons, CMS, reports, RBAC and audit. Use when building admin features.
---

# Admin Dashboard

## Overview widgets
Revenue, GMV, orders, customers, sellers, pending seller applications, pending product approvals, orders awaiting dispatch, refund requests, platform commission, monthly sales chart, best categories, recent transactions. **GMV ≠ revenue** — revenue is commission/fees.

## Sellers
View, approve, reject, suspend, reactivate; view documents, sales, products, order history, performance; manage permissions.

## Products
View all; approve/reject; edit/remove; categories; tags; feature; curated collections; visibility; reported products.

## Orders
Search; filter by seller, buyer, status; view suborders; track shipments; cancellations; failed pickups; returns; refunds; disputes.

## Payments & commission
Commission rates, transactions, settlements, refunds, failed transactions, reconciliation, exports. Backed by the ledger (`payments-ledger`).

## Coupons
Types: percentage, fixed, first-order, category, seller-specific, limited-use. Controls: validity, min order value, max discount, usage limit, applicable products, active flag.

## Content (CMS)
Hero banners, homepage sections, featured sellers/products, collections, categories, editorial, campaigns, FAQs, static pages.

## Customers
View, orders, support requests, suspend abusive accounts (justified + audited), reported issues, communication.

## Reports
Daily/monthly sales, GMV, commission, AOV, orders by category/seller, cancellation rate, return rate, refund value, repeat customer rate, seller performance.

## Roles (RBAC)
Super Admin, Operations Manager, Product Manager, Customer Support, Finance Manager. Permission-check every action server-side. Refunds, settlements, suspensions require explicit permission and write to `audit_logs` (actor, action, target, before/after, timestamp, IP).
