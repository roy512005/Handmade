/**
 * Demo mode turns on everything that must never run on a live site: seeded accounts with
 * published passwords, the mock payment page and the courier simulator.
 * Always on outside production; in production it has to be requested explicitly.
 */
export const demoMode = () => process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";

const DEV_SECRET = "dev-only-webhook-secret";

/** Read at call time (not import time) so `next build` works without secrets. */
export function webhookSecret(): string {
  const s = process.env.PAYMENT_WEBHOOK_SECRET;
  if (process.env.NODE_ENV !== "production") return s || DEV_SECRET;
  if (!s || s.length < 32 || s === DEV_SECRET) throw new Error("Set PAYMENT_WEBHOOK_SECRET to a random value of at least 32 characters.");
  return s;
}
