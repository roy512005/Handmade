---
name: seller-dashboard
description: Seller registration, approval, product management, order fulfilment, shipping responsibilities, earnings and profile. Use when building seller-facing features.
---

# Seller Dashboard

Must be usable by a non-technical artisan: simple language, few steps, mobile-friendly.

## Registration
Fields: full name, brand name, email, mobile, password, seller type (individual artisan, handmade creator, small handmade business, registered business), business address, pickup address, PAN/tax details, bank/settlement details, ID/business documents. Collect only what verification and compliance need.

## Approval
Statuses: pending → under review → approved | rejected | suspended. Registration never grants selling rights. Documents are private (admin + owner only).

## Overview widgets
Total sales, total orders, pending, completed, products listed, active products, available balance, pending settlements, recent activity, sales chart.

## Products
Add/edit/archive; multiple images; description; category; variants; price; stock; weight; dimensions; processing time; custom-made flag; availability.
Statuses: draft → pending approval → approved | rejected | paused. Only approved shows publicly. Edits to approved listings may need re-approval (decide in policy).

## Orders
New orders, accept/reject (per policy), fulfilment-only buyer info, prepare, pack, ready for pickup, print label, tracking, cancellations/returns.
Flow: New → Accept → Prepare → Pack → Ready for pickup → Courier pickup → Delivery.

## Shipping duties
Seller: pack safely, give accurate weight/dimensions, have package ready at pickup address. Platform: rates, shipment, label, pickup request, tracking, notifications. If PIN unserviceable, show clear alternative instead of creating an invalid shipment. See `shipping-tracking`.

## Earnings
Gross sales, commission, adjustments, refund deductions, net, pending and completed settlement, history. Data comes from `seller_ledger_entries` (see `payments-ledger`). The 12% example is illustrative, not a settlement rule.

## Profile
Brand name, image, description, artisan story, categories, pickup address, contact, approved social links. Public seller page highlights story + products.
