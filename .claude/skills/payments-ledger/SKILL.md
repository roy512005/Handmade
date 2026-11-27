---
name: payments-ledger
description: Payment processing, commission, seller ledger, settlements and refunds. Use for any money-related code.
---

# Payments, Commission & Ledger

## Hard rules
- All amounts are integer paise (`bigint`). No floats, no JS number math on rupees.
- Seller earnings are computed from an **append-only** `seller_ledger_entries` table. Corrections are new entries, never edits.
- Payment verification and commission calc happen server-side only.
- Verify gateway webhook signatures; process idempotently; log every event in `payment_events`.
- Use only a provider with an approved marketplace/split-settlement arrangement. Do not collect buyer money and pay sellers via an unapproved route.

## Commission
Pilot 10–12% of product value per suborder, configurable (global, then per category/seller). Store the rate applied on each `commissions` row at order time.
Illustration: ₹1,000 sale, 12% → ₹120 commission, ₹880 before other adjustments. Illustrative only; actual accounting follows the approved settlement structure.

## Ledger entry types
`sale`, `commission`, `shipping_adjustment`, `refund_reversal`, `commission_reversal`, `adjustment`, `settlement_payout`. Each has suborder_id, seller_id, amount_paise (signed), status (pending/available/settled), created_at, reference.
Balance = SUM(entries) by status. Pending → available after delivery + return window.

## Settlements
Batch available balance per seller → `settlements` record → payout via provider → mark entries settled. Store provider reference; reconcile daily against gateway reports.

## Refunds
`return_requests` → approval → `refunds` (full/partial, per suborder/item) → gateway refund → reversal ledger entries. Finance permission + audit log required.

## Admin views
Transactions, failed payments, settlements, refunds, reconciliation, CSV export.

## Tests to write
Rounding, partial refunds, double webhook, out-of-order events, failed payout retry, commission rate change after order.
