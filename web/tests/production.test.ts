import { describe, it, expect, vi, afterEach } from "vitest";

process.env.DATA_DIR = "memory://";
import { createDb } from "@/lib/server/db";
import { seedIfEmpty, DEMO } from "@/lib/server/seed";
import { demoMode, webhookSecret } from "@/lib/server/env";
import { simulateGatewayEvent, verifySignature } from "@/lib/server/payments";

afterEach(() => vi.unstubAllEnvs());
const live = () => { vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("DEMO_MODE", ""); };

describe("production safety", () => {
  it("refuses a missing, short or development webhook secret", () => {
    live();
    for (const bad of ["", "short", "dev-only-webhook-secret"]) {
      vi.stubEnv("PAYMENT_WEBHOOK_SECRET", bad);
      expect(() => webhookSecret()).toThrow(/PAYMENT_WEBHOOK_SECRET/);
      expect(() => verifySignature("{}", "abc")).toThrow();
    }
    vi.stubEnv("PAYMENT_WEBHOOK_SECRET", "x".repeat(32));
    expect(webhookSecret()).toHaveLength(32);
  });

  it("disables mock payments unless demo mode is requested", async () => {
    live();
    expect(demoMode()).toBe(false);
    await expect(simulateGatewayEvent("mp_x", "payment.captured")).rejects.toThrow(/disabled/);
    vi.stubEnv("DEMO_MODE", "true");
    expect(demoMode()).toBe(true);
  });

  it("seeds no demo accounts on a live database and creates only the configured admin", async () => {
    live();
    const db = await createDb();
    await seedIfEmpty(db);
    const count = async (t: string) => (await db.query<{ c: number }>(`select count(*)::int c from ${t}`)).rows[0].c;
    expect(await count("users")).toBe(0);
    expect(await count("products")).toBe(0);
    expect(await count("categories")).toBeGreaterThan(0);
    vi.stubEnv("ADMIN_EMAIL", "owner@example.com");
    vi.stubEnv("ADMIN_PASSWORD", "short");
    await expect(seedIfEmpty(db)).rejects.toThrow(/12 characters/);
    vi.stubEnv("ADMIN_PASSWORD", "a-long-test-password");
    await seedIfEmpty(db);
    await seedIfEmpty(db); // idempotent
    expect((await db.query<{ email: string }>("select email from users")).rows).toEqual([{ email: "owner@example.com" }]);
    expect(DEMO.admin.email).not.toBe("owner@example.com");
    await db.close();
  });
});
