import { createHash, randomBytes } from "node:crypto";
import { q, q1, tx } from "./db";
import { demoMode } from "./env";
import { hashPassword } from "./password";

const MINUTES = 30;
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** Returns the raw token for an active account, otherwise null. Never show either outcome to the requester. */
export async function createResetToken(email: string): Promise<string | null> {
  const u = await q1<{ id: string }>("select id from users where email = $1 and status = 'active'", [email]);
  if (!u) return null;
  const token = randomBytes(32).toString("hex");
  await tx(async (db) => {
    await q("update password_resets set used_at = now() where user_id = $1 and used_at is null", [u.id], db);
    await q("insert into password_resets (user_id, token_hash, expires_at) values ($1,$2, now() + ($3 || ' minutes')::interval)", [u.id, hash(token), String(MINUTES)], db);
  });
  return token;
}

/**
 * Delivery adapter. No email provider is connected yet: demo mode prints the link to the
 * server console; a live site sends nothing and never writes the token to its logs.
 * The base URL comes from APP_URL, never from request headers.
 */
export function deliverResetLink(token: string) {
  if (!demoMode()) return console.error("[password-reset] No email provider configured; the reset link was not sent.");
  console.log(`[password-reset] ${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`);
}

/** Single use. Changing the password signs the account out everywhere. */
export async function resetPassword(token: string, password: string): Promise<boolean> {
  return tx(async (db) => {
    const r = await q1<{ user_id: string }>(
      "update password_resets set used_at = now() where token_hash = $1 and used_at is null and expires_at > now() returning user_id", [hash(token)], db);
    if (!r) return false;
    await q("update users set password_hash = $2 where id = $1", [r.user_id, hashPassword(password)], db);
    await q("delete from sessions where user_id = $1", [r.user_id], db);
    return true;
  });
}
