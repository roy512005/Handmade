---
name: notifications
description: Notification events and channels for buyers, sellers and admins. Use when adding emails, SMS/WhatsApp or in-app alerts.
---

# Notifications

Channels: in-app (always), email, SMS/WhatsApp via approved providers (transactional by default; promotional only with consent).

## Buyer
Account verification, order confirmation, payment confirmation, dispatched, shipment updates, delivery confirmation, refund updates, promotions (opt-in).

## Seller
New order, product approved/rejected, stock alerts, pickup updates, return requests, settlement updates, verification updates.

## Admin
New seller application, new product submission, payment failure, failed pickup, refund request, customer complaint, suspicious activity.

## Implementation notes
- Event-driven: domain event → notification service → channel adapters.
- `notifications` table stores in-app items (user_id, type, payload, read_at).
- Templates versioned; no sensitive data (full address, bank) in messages.
- Queue with retries and dedupe key per (event, recipient, channel).
- Respect unsubscribe/consent; OTP rate-limited.
