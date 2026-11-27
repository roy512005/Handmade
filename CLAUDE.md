# Handmade Marketplace

Multi-vendor handmade marketplace (India). Read `PLAN.md` first; domain guidance is in `.claude/skills/*/SKILL.md`.

## Rules
- Money = integer paise. No floating-point.
- Earnings via append-only ledger; never derive from mutable order totals.
- Cart → parent order → seller suborders (one shipment each).
- Payments/orders: transactional + idempotent; verify webhook signatures.
- Authorization on the server (RBAC + RLS). Never trust client roles.
- Public = approved sellers + approved products only.
- Don't expose seller documents, bank info or buyer addresses.
- Stack: Next.js, TypeScript, Tailwind, shadcn/ui, Zod, Postgres, Supabase.
- Follow the design tokens in the `design-system` skill; don't invent colours.
- Build only the current phase (see `mvp-roadmap`).
