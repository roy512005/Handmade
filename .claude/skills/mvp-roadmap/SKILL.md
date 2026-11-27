---
name: mvp-roadmap
description: Phase gating, scope control and definition of done for the marketplace MVP. Use when deciding what to build next or whether something is in scope.
---

# MVP Roadmap

Build only the current phase. Don't pre-build future features.

## Phases
1. **Foundation** — design system, homepage, categories, listing, PDP, search, auth, seller registration, admin login
2. **Marketplace ops** — seller approval, product submission/approval, seller dashboard, inventory, cart, checkout, parent/suborders, buyer order history
3. **Transactions** — payment integration, commission ledger, settlements, shipping, tracking, notifications, cancel/refund
4. **Launch readiness** — reviews, wishlist, coupons, support, analytics, security review, e2e tests, real shipment test

## Future (do not build now)
Seller subscriptions, featured listings, recommendations, personalised collections, loyalty/referrals, multi-language, mobile app, ONDC.

## Scope rules
- One commission fee at launch; no stacked seller fees.
- COD only if operationally supported.
- If a request belongs to a later phase, note it and defer.

## Definition of done (per feature)
- [ ] Works for the relevant role with correct authorization
- [ ] Zod validation + error/empty/loading states
- [ ] Uses design tokens; responsive at 360px
- [ ] Money in paise; tests for logic that touches it
- [ ] Audit log for sensitive actions
- [ ] Playwright path for critical flows (checkout, seller approval, refund)

## Targets
30d: 5–10 sellers, 30–50 listings. 90d: 10–15 sellers, 50–100 products, 10–20 real orders. 6mo: quality, conversion, repeat, delivery reliability.
