---
name: order-workflow
description: Multi-seller order model — parent orders, seller suborders, statuses, checkout transaction, idempotency. Use when touching cart-to-delivery logic.
---

# Order Workflow

## Model
One checkout → one `parent_orders` row (e.g. ORD-1001) → one `seller_suborders` row per seller (SUB-1001-A/B/C) → `order_items`. Each suborder has its own fulfilment, shipment and tracking number. Buyer sees one order with separate shipment updates.

## Flow
1. Add to cart
2. Server validates stock + price
3. Checkout
4. Payment processed
5. Server verifies payment (webhook/signature) — never trust the client redirect
6. Create parent order + suborders (single DB transaction)
7. Notify sellers
8. Sellers prepare
9. Labels generated
10. Courier pickup per seller
11. Tracking auto-updates
12. Delivered
13. Return/refund window and settlement rules apply
14. Settlement via approved provider

## Statuses
Order placed → payment confirmed → seller preparing → ready for pickup → picked up → in transit → out for delivery → delivered.
Exceptions: cancellation requested, cancelled, return requested, return in progress, refunded, delivery failed.
Parent status is derived from suborder statuses. Use a state-machine with allowed transitions; reject illegal jumps.

## Reliability rules
- Idempotency key on checkout and payment confirmation; unique constraints on `payments.provider_payment_id`.
- Stock decrement inside the order transaction (row lock or conditional update) to prevent overselling.
- Webhook handlers are replay-safe; store raw events in `payment_events`/`shipment_events`.
- Price snapshot on `order_items` (paise); later product edits don't change past orders.
- Reservation or fail-fast for stock during payment window; release on timeout.
- Seller reject/cancel → partial refund of that suborder only.
