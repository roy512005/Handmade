import { q, type Queryable } from "./db";

/** In-app notification (+ console "email" in dev; swap for a real provider). */
export async function notify(userId: string, type: string, payload: Record<string, unknown>, dedupeKey?: string, db?: Queryable) {
  await q(
    "insert into notifications (user_id, type, payload, dedupe_key) values ($1,$2,$3,$4) on conflict (dedupe_key) do nothing",
    [userId, type, JSON.stringify(payload), dedupeKey ?? null], db);
  if (process.env.NODE_ENV !== "test") console.log(`[notify] ${type} → ${userId}`, payload);
}

export async function notifyAdmins(type: string, payload: Record<string, unknown>, db?: Queryable) {
  const admins = await q<{ user_id: string }>("select distinct user_id from user_roles where role in ('super_admin','operations_manager')", [], db);
  for (const a of admins) await notify(a.user_id, type, payload, undefined, db);
}

export async function notifySeller(sellerId: string, type: string, payload: Record<string, unknown>, db?: Queryable) {
  const s = await q<{ user_id: string }>("select user_id from seller_profiles where id = $1", [sellerId], db);
  if (s[0]) await notify(s[0].user_id, type, payload, undefined, db);
}
