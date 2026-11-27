# Handmade Marketplace — Master Plan

Multi-vendor marketplace for genuine handmade products, India first. Roles: Buyer, Seller, Admin.
Differentiator: authenticity, real creators, curation, discovery — not price.

Detailed guidance lives in project skills under `.claude/skills/` (see index at the bottom).

## 1. Stack
- Next.js + TypeScript + React + Tailwind + shadcn/ui, React Hook Form + Zod, TanStack Query where needed
- Backend (MVP): Next.js server/API routes, PostgreSQL, Supabase Auth, Supabase Storage or Cloudinary
- Integrations: marketplace-capable payment gateway, Shiprocket (or similar), email, SMS/OTP, analytics, error monitoring
- Ops: GitHub, Vercel, DB backups, CI/CD, Playwright e2e

Server-only: payment verification, commission calc, stock updates, permissions.

## 2. Non-negotiable rules
1. Money is integer paise. Never floats.
2. Seller earnings come from an append-only ledger, not mutable order totals.
3. One cart → one parent order → N seller suborders, each with its own shipment.
4. Payment and order creation are idempotent and transactional; webhooks are signature-verified.
5. Only approved sellers + approved products are public.
6. Seller documents, bank info and buyer addresses are never public (RLS + server checks).
7. Sensitive admin actions (refund, settlement, suspension) are RBAC-gated and audit-logged.
8. Don't move real money until payment provider approval + legal/CA sign-off.

## 3. Phases

### Phase 1 — Foundation (Weeks 1–4)
Design system, homepage, category pages, listing, product details, search, auth, seller registration, admin login.

### Phase 2 — Marketplace operations (Weeks 5–8)
Seller approval, product submission/approval, seller dashboard, inventory, cart, checkout, parent orders + suborders, buyer order history.

### Phase 3 — Transactions (Weeks 9–11)
Payment integration, commission ledger, settlements, shipping + tracking, notifications, cancellation/refund flows.

### Phase 4 — Launch readiness (Weeks 11–12)
Reviews, wishlist, coupons, support, analytics, security review, Playwright e2e, real shipment test, pilot launch.

Timeline is an estimate; payment approval, legal setup and courier eligibility can shift it.

## 4. Week-by-week
| Week | Work |
|---|---|
| 1 | Research, architecture, schema draft |
| 2 | Design system + UI foundation |
| 3–4 | Buyer storefront |
| 5–6 | Seller dashboard |
| 7 | Admin dashboard |
| 8 | Cart + order management |
| 9 | Payments + ledger |
| 10 | Shipping + tracking |
| 11 | Notifications + testing |
| 12 | Pilot launch |

## 5. Suggested repo layout
```
/app
  (storefront)/        buyer site
  seller/              seller dashboard
  admin/               admin dashboard
  api/                 route handlers + webhooks
/components            ui/ (shadcn), storefront/, seller/, admin/
/lib                   db, auth, rbac, money, ledger, shipping, payments, validation
/db                    migrations, seed, RLS policies
/tests                 unit + playwright
```

## 6. Open decisions (need owner input)
- Payment provider with approved marketplace/split settlement model
- COD: offer or not
- Commission rate to pilot (10–12%) and settlement delay after delivery
- Return window length and which categories are non-returnable (custom items)
- Business structure, GST/e-commerce operator obligations (CA/legal)
- Supabase Storage vs Cloudinary

## 7. Launch targets (goals, not guarantees)
- 30 days: contact 30–50 sellers, recruit 5–10, collect 30–50 listings
- 90 days: controlled MVP, 10–15 sellers, 50–100 approved products, first 10–20 real orders
- 6 months: seller quality, conversion, repeat purchase, delivery reliability

## 8. Success metrics
Active sellers, approved products, MAB, product conversion, add-to-cart, checkout completion, AOV, GMV, commission revenue, contribution margin/order, cancellation %, return/refund %, repeat rate, seller fulfilment time, on-time delivery. Traffic alone is not success.

## 9. Skill index
| Skill | Purpose |
|---|---|
| `design-system` | Brand, colours, type, UI rules |
| `buyer-storefront` | Homepage, listing, PDP, search, cart, checkout, account |
| `seller-dashboard` | Registration, approval, products, orders, earnings |
| `admin-dashboard` | Sellers, products, orders, coupons, CMS, reports, RBAC |
| `order-workflow` | Parent/suborder model, statuses, idempotency |
| `payments-ledger` | Payments, commission, ledger, settlements, refunds |
| `shipping-tracking` | Courier aggregator, labels, webhooks, tracking |
| `database-schema` | Entities, conventions, indexes, RLS |
| `notifications` | Buyer/seller/admin events and channels |
| `security-compliance` | Security safeguards, legal/ops checklist |
| `mvp-roadmap` | Phase gating, scope control, definition of done |
