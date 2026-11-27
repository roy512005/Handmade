# Handmade Marketplace — web app

Multi-vendor handmade marketplace (India): buyer storefront, seller dashboard, admin dashboard.
Product requirements: `../PLAN.md`. Domain guidance: `../.claude/skills/*/SKILL.md`.

## Run

```bash
npm install --legacy-peer-deps
npm run dev            # http://localhost:3000 (one server per data folder — see below)
npm test               # schema, order flow, ledger, search, dashboard queries, production safety
npm run test:e2e       # browser tests: checkout, refund, seller approval, password reset (first run: npx playwright install chromium)
npm run build && npm start
```

No external services are needed: the database is embedded Postgres ([PGlite](https://pglite.dev)) stored in `.data/`.
Delete `.data/` to reset to the seed data.

### Demo accounts (development only)
| Role | Email | Password |
|---|---|---|
| Buyer | buyer@handmade.test | Buyer@12345 |
| Seller (Mitti Studio) | seller@handmade.test | Seller@12345 |
| Admin (super admin) | admin@handmade.test | Admin@12345 |

Coupons: `WELCOME10` (10%, min ₹500, max ₹300, once per user), `FLAT100` (₹100 off ₹1000+).

## Storefront: discovery-first

- **Palette & type:** #F7F3EA / #293D35 / #C66D4B / #D9B982 / #282723; Bricolage Grotesque headings, Inter body, DM Sans for product details.
- **Imagery:** the demo has no photographs, so product/maker artwork is generated as SVG (`/art/...`, see `src/lib/art.ts`). It is labelled as demo artwork; seller uploads replace it.
- **Discovery:** masonry feed (mood, category, price, material, sort), "picked for you" ordering from your wishlist, boards, orders and followed makers.
- **Repeat-visit features (all real, none manufactured):** follow artisans, moodboards (private or shareable), recently viewed (cookie), wishlist price-drop and back-in-stock alerts, new-piece alerts from followed makers, a weekly drop collection, and notification preferences (promotional drops are opt-in).
- **Honesty rules:** "New" = published in the last 14 days; "One of a kind" requires the seller to say so; no countdowns, fake scarcity or seeded reviews (reviews need a delivered order).

## Production mode
With `NODE_ENV=production` (`npm start`) the app is locked down unless `DEMO_MODE=true`:

| Variable | Purpose |
|---|---|
| `PAYMENT_WEBHOOK_SECRET` | Required, 32+ random characters. Webhooks fail without it. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Creates the first super admin (12+ character password). Remove after first start. |
| `APP_URL` | Base URL used in password reset links. |
| `DEMO_MODE` | `true` enables demo accounts, mock payments, courier simulation and mock payouts. **Never set it on a live site.** |
| `DATA_DIR`, `UPLOAD_DIR` | Where the embedded database and uploaded files live. |

Without `DEMO_MODE` a new database gets categories only, and checkout and payouts are blocked until real providers are connected.
Start a live site with an empty data folder: a database seeded in demo mode still contains the demo accounts.

## What's real vs. simulated

| Area | Status |
|---|---|
| Catalogue, cart, checkout, parent order + seller suborders, stock reservation | Real |
| Order state machine, cancellation, returns, refunds | Real |
| Commission + append-only seller ledger (DB trigger blocks edits/deletes), settlements | Real |
| Auth (scrypt passwords, hashed session tokens), RBAC, audit log | Real |
| Image/document upload (type checked by file contents) | Real, stored on local disk |
| Payments | **Simulated** (`lib/server/payments.ts`, "MockPay"). Only a signed webhook confirms payment. |
| Courier | **Simulated** (`lib/server/shipping.ts`). Admin can fire tracking events; `/api/webhooks/courier` is signed. |
| Email / SMS / WhatsApp | **Not sent** — in-app notifications only (+ console log). Preferences are stored and respected. |
| Product photography | **Generated demo art** until sellers upload real photos. |
| Bank payouts | **Simulated** |

## Before going live
- Swap `lib/server/db.ts` for hosted Postgres (Supabase etc.). `db/migrations/0003_rls_supabase.sql` is for Supabase only.
- Replace the payment adapter with a gateway that supports marketplace split settlement; set `PAYMENT_WEBHOOK_SECRET`.
- Replace the courier adapter (Shiprocket etc.) and the file storage (object storage).
- Add real email/SMS providers (until then password reset links are only printed to the console in demo mode); add rate limiting (current login throttle is in-memory).
- Legal/CA checklist in `.claude/skills/security-compliance/SKILL.md`. Policy pages are placeholders.

## Running more than one server
The embedded database allows **one process per data folder**; the app refuses to start a second one on the same folder.
For a second server use `DATA_DIR=.data/second npm run dev`. To build while `npm run dev` is running: `NEXT_DIST_DIR=.next-build npm run build`.
