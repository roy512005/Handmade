import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHash, randomBytes } from "node:crypto";
import { q, q1 } from "./db";

const SESSION_DAYS = 14;
const ADMIN_ROLES = ["super_admin", "operations_manager", "product_manager", "customer_support", "finance_manager"];

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  sellerId: string | null;
  sellerStatus: string | null;
  isAdmin: boolean;
};

export type Perm = "sellers" | "products" | "orders" | "finance" | "refunds" | "content" | "customers" | "coupons" | "reports";

const PERMS: Record<string, Perm[]> = {
  super_admin: ["sellers", "products", "orders", "finance", "refunds", "content", "customers", "coupons", "reports"],
  operations_manager: ["sellers", "orders", "refunds", "reports"],
  product_manager: ["products", "content", "coupons"],
  customer_support: ["orders", "customers", "refunds"],
  finance_manager: ["finance", "refunds", "reports"],
};

export function can(user: SessionUser, perm: Perm): boolean {
  return user.roles.some((r) => PERMS[r]?.includes(perm));
}

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await q("insert into sessions (user_id, token_hash, expires_at) values ($1,$2, now() + ($3 || ' days')::interval)", [userId, hash(token), String(SESSION_DAYS)]);
  (await cookies()).set("sid", token, {
    httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const t = jar.get("sid")?.value;
  if (t) await q("delete from sessions where token_hash = $1", [hash(t)]);
  jar.delete("sid");
}

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const t = (await cookies()).get("sid")?.value;
  if (!t) return null;
  const row = await q1<{ id: string; email: string; full_name: string | null; status: string }>(
    `select u.id, u.email, u.full_name, u.status from sessions s join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`, [hash(t)]);
  if (!row || row.status !== "active") return null;
  const roles = (await q<{ role: string }>("select role from user_roles where user_id = $1", [row.id])).map((r) => r.role);
  const seller = await q1<{ id: string; status: string }>("select id, status from seller_profiles where user_id = $1", [row.id]);
  return {
    id: row.id, email: row.email, name: row.full_name, roles,
    sellerId: seller?.id ?? null, sellerStatus: seller?.status ?? null,
    isAdmin: roles.some((r) => ADMIN_ROLES.includes(r)),
  };
});

export async function requireUser(next = "/"): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect(`/login?next=${encodeURIComponent(next)}`);
  return u;
}

/** Seller area: must be a seller account. Approval is checked by pages that need it. */
export async function requireSeller(): Promise<SessionUser & { sellerId: string }> {
  const u = await requireUser("/seller");
  if (!u.sellerId) redirect("/sell");
  return u as SessionUser & { sellerId: string };
}

export async function requireApprovedSeller() {
  const u = await requireSeller();
  if (u.sellerStatus !== "approved") redirect("/seller");
  return u;
}

export async function requireAdmin(perm?: Perm): Promise<SessionUser> {
  const u = await requireUser("/admin");
  if (!u.isAdmin) redirect("/");
  if (perm && !can(u, perm)) redirect("/admin?denied=1");
  return u;
}

// naive in-memory login throttle: 8 attempts / 15 min per email
const attempts = new Map<string, { n: number; reset: number }>();
export function throttle(key: string, max = 8, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.reset < now) { attempts.set(key, { n: 1, reset: now + windowMs }); return true; }
  a.n++;
  return a.n <= max;
}

export async function audit(actorId: string | null, action: string, targetType: string, targetId: string | null, after?: unknown, before?: unknown) {
  await q("insert into audit_logs (actor_id, action, target_type, target_id, before, after) values ($1,$2,$3,$4,$5,$6)",
    [actorId, action, targetType, targetId, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null]);
}
