import { describe, it, expect } from "vitest";

process.env.DATA_DIR = "memory://";
import { q, q1 } from "@/lib/server/db";
import { DEMO } from "@/lib/server/seed";
import { createResetToken, resetPassword } from "@/lib/server/passwordReset";
import { verifyPassword } from "@/lib/server/password";

const user = () => q1<{ id: string; password_hash: string }>("select id, password_hash from users where email = $1", [DEMO.buyer.email]);

describe("password reset", () => {
  it("gives nothing for an unknown email", async () => {
    expect(await createResetToken("nobody@example.com")).toBeNull();
  });
  it("works once, stores only a hash and signs out existing sessions", async () => {
    const u = (await user())!;
    await q("insert into sessions (user_id, token_hash, expires_at) values ($1,'old', now() + interval '1 day')", [u.id]);
    const token = (await createResetToken(DEMO.buyer.email))!;
    expect((await q("select 1 from password_resets where token_hash = $1", [token])).length).toBe(0);
    expect(await resetPassword(token, "Brand-new-pass1")).toBe(true);
    expect(verifyPassword("Brand-new-pass1", (await user())!.password_hash)).toBe(true);
    expect((await q("select 1 from sessions where user_id = $1", [u.id])).length).toBe(0);
    expect(await resetPassword(token, "Another-pass-22")).toBe(false);
  });
  it("rejects expired and superseded links", async () => {
    const first = (await createResetToken(DEMO.buyer.email))!;
    const second = (await createResetToken(DEMO.buyer.email))!;
    expect(await resetPassword(first, "Another-pass-22")).toBe(false);
    await q("update password_resets set expires_at = now() - interval '1 minute' where used_at is null");
    expect(await resetPassword(second, "Another-pass-22")).toBe(false);
  });
});
