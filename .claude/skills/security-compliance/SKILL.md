---
name: security-compliance
description: Security safeguards and legal/operational launch checklist. Use for auth, uploads, webhooks, PII handling and pre-launch review.
---

# Security & Compliance

## Safeguards
- Server-side authN/authZ; RBAC; RLS in Postgres
- Secure password handling (provider-managed), OTP rate limiting
- Zod validation on every input; output encoding; CSRF/XSS/SQLi/SSRF protections
- File uploads: type/size/magic-byte checks, private buckets for documents, signed URLs
- Webhook signature verification; idempotent processing
- Secrets in env vars only; separate dev/staging/prod
- Audit logs for refunds, settlements, suspensions, role changes
- Backups with tested restore; error monitoring; rate limiting on auth/search/coupon endpoints
- Never expose seller documents, bank info or buyer addresses publicly

## Legal / operational checklist (verify with CA/lawyer before real transactions)
- [ ] Business structure
- [ ] GST registration + e-commerce operator obligations
- [ ] Seller verification requirements
- [ ] Consumer Protection (E-Commerce) Rules applicability
- [ ] Privacy policy, terms and conditions
- [ ] Shipping, cancellation/refund, return/replacement policies
- [ ] Seller agreement; commission & settlement agreement
- [ ] Payment provider approval (marketplace settlement model)
- [ ] Invoicing and accounting responsibilities

Do not collect payments and distribute seller proceeds through an unapproved arrangement.

## Pre-launch review
Dependency audit, authz test matrix (buyer/seller/admin cross-access), webhook replay tests, PII access review, Playwright e2e on checkout, a real shipment test.
