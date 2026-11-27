"use server";
import { z } from "zod";
import { q, q1, tx } from "@/lib/server/db";
import { createSession, destroySession, throttle } from "@/lib/server/auth";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { mergeGuestCart } from "@/lib/server/cart";
import { go, parseForm, safeNext } from "@/lib/server/form";
import { notifyAdmins } from "@/lib/server/notify";
import { createResetToken, deliverResetLink, resetPassword } from "@/lib/server/passwordReset";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.");
const password = z.string().min(8, "Password must be at least 8 characters.").max(200);
const phone = z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.");

export async function login(fd: FormData) {
  const p = parseForm(z.object({ email, password: z.string().min(1), next: z.string().optional() }), fd);
  const next = safeNext(fd.get("next"));
  if (!p.ok) go(`/login?next=${encodeURIComponent(next)}`, { err: p.error });
  if (!throttle(`login:${p.data.email}`)) go("/login", { err: "Too many attempts. Try again in a few minutes." });
  const u = await q1<{ id: string; password_hash: string | null; status: string }>("select id, password_hash, status from users where email = $1", [p.data.email]);
  // same message for unknown email and wrong password
  if (!u || !verifyPassword(p.data.password, u.password_hash)) go(`/login?next=${encodeURIComponent(next)}`, { err: "Incorrect email or password." });
  if (u.status !== "active") go("/login", { err: "This account has been suspended." });
  await createSession(u.id);
  await mergeGuestCart(u.id);
  const roles = (await q<{ role: string }>("select role from user_roles where user_id = $1", [u.id])).map((r) => r.role);
  const home = next !== "/" ? next : roles.some((r) => !["buyer", "seller"].includes(r)) ? "/admin" : roles.includes("seller") ? "/seller" : "/";
  go(home);
}

export async function registerBuyer(fd: FormData) {
  const p = parseForm(z.object({ name: z.string().trim().min(2, "Enter your name."), email, password, marketing: z.string().optional() }), fd);
  const next = safeNext(fd.get("next"));
  if (!p.ok) go("/register", { err: p.error });
  if (await q1("select 1 from users where email = $1", [p.data.email])) go("/register", { err: "An account with this email already exists. Try signing in." });
  const id = await tx(async (db) => {
    const u = (await q1<{ id: string }>("insert into users (email, full_name, password_hash) values ($1,$2,$3) returning id", [p.data.email, p.data.name, hashPassword(p.data.password)], db))!;
    await q("insert into user_roles (user_id, role) values ($1,'buyer')", [u.id], db);
    await q("insert into buyer_profiles (user_id, marketing_consent) values ($1,$2)", [u.id, !!p.data.marketing], db);
    return u.id;
  });
  await createSession(id);
  await mergeGuestCart(id);
  go(next);
}

const sellerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  brand: z.string().trim().min(2, "Enter your brand name.").max(60),
  email, phone, password,
  sellerType: z.enum(["individual_artisan", "handmade_creator", "small_business", "registered_business"]),
  businessAddress: z.string().trim().min(5, "Enter your business address."),
  pickupLine1: z.string().trim().min(3, "Enter the pickup address."),
  pickupCity: z.string().trim().min(2, "Enter the pickup city."),
  pickupState: z.string().trim().min(2, "Enter the pickup state."),
  pickupPin: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pickup PIN code."),
  pan: z.string().trim().toUpperCase().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN (e.g. ABCDE1234F)."),
  holder: z.string().trim().min(2, "Enter the bank account holder name."),
  account: z.string().trim().regex(/^\d{9,18}$/, "Enter a valid bank account number."),
  ifsc: z.string().trim().toUpperCase().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code."),
  agree: z.literal("on", { error: "Please accept the seller agreement." }),
});

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export async function registerSeller(fd: FormData) {
  const p = parseForm(sellerSchema, fd);
  if (!p.ok) go("/sell", { err: p.error });
  const d = p.data;
  if (await q1("select 1 from users where email = $1", [d.email])) go("/sell", { err: "An account with this email already exists. Sign in and contact support to add a seller profile." });
  let slug = slugify(d.brand) || "maker";
  if (await q1("select 1 from seller_profiles where slug = $1", [slug])) slug += "-" + Math.random().toString(36).slice(2, 6);

  const userId = await tx(async (db) => {
    const u = (await q1<{ id: string }>("insert into users (email, phone, full_name, password_hash) values ($1,$2,$3,$4) returning id", [d.email, d.phone, d.name, hashPassword(d.password)], db))!;
    await q("insert into user_roles (user_id, role) values ($1,'seller'), ($1,'buyer')", [u.id], db);
    await q("insert into buyer_profiles (user_id) values ($1)", [u.id], db);
    const sp = (await q1<{ id: string }>(
      `insert into seller_profiles (user_id, brand_name, slug, seller_type, status, pan_last4) values ($1,$2,$3,$4,'pending',$5) returning id`,
      [u.id, d.brand, slug, d.sellerType, d.pan.slice(-4)], db))!;
    await q("insert into addresses (seller_id, kind, name, phone, line1, city, state, pincode) values ($1,'business',$2,$3,$4,'-','-','110001')", [sp.id, d.brand, d.phone, d.businessAddress], db);
    await q("insert into addresses (seller_id, kind, name, phone, line1, city, state, pincode, is_default) values ($1,'pickup',$2,$3,$4,$5,$6,$7,true)", [sp.id, d.brand, d.phone, d.pickupLine1, d.pickupCity, d.pickupState, d.pickupPin], db);
    // Only the last 4 digits are stored; the full number goes to the payout provider (mock).
    await q("insert into seller_bank_accounts (seller_id, account_holder, account_last4, ifsc, provider_ref) values ($1,$2,$3,$4,$5)", [sp.id, d.holder, d.account.slice(-4), d.ifsc, "mockfa_" + Date.now()], db);
    await notifyAdmins("new_seller_application", { brand: d.brand }, db);
    return u.id;
  });
  await createSession(userId);
  go("/seller", { msg: "Application received! We'll review it and email you soon." });
}

export async function logout() {
  await destroySession();
  go("/");
}

export async function forgotPassword(fd: FormData) {
  const p = parseForm(z.object({ email }), fd);
  if (!p.ok) go("/forgot-password", { err: p.error });
  // same reply whether or not the account exists, including when throttled
  if (throttle(`reset:${p.data.email}`, 3)) {
    const token = await createResetToken(p.data.email);
    if (token) deliverResetLink(token);
  }
  go("/forgot-password", { msg: "If an account exists for that email, a reset link will be sent. It works for 30 minutes." });
}

export async function choosePassword(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const p = parseForm(z.object({ password }), fd);
  if (!p.ok) go(`/reset-password?token=${encodeURIComponent(token)}`, { err: p.error });
  if (!(await resetPassword(token, p.data.password))) go("/forgot-password", { err: "That link is invalid or has expired. Request a new one." });
  go("/login", { msg: "Password changed. Sign in with your new password." });
}

export async function subscribeNewsletter(fd: FormData) {
  const p = parseForm(z.object({ email }), fd);
  if (!p.ok) go("/", { err: p.error });
  await q("insert into newsletter_subscribers (email) values ($1) on conflict do nothing", [p.data.email]);
  go("/", { msg: "Thanks for subscribing!" });
}
