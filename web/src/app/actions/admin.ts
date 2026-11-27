"use server";
import { z } from "zod";
import { demoMode } from "@/lib/server/env";
import { revalidatePath } from "next/cache";
import { audit, requireAdmin } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { go, parseForm } from "@/lib/server/form";
import { notify, notifySeller } from "@/lib/server/notify";
import { adminCancel, adminRefund, applyCourierEvent, decideReturn, NEXT_COURIER } from "@/lib/server/orders";
import { settleSeller } from "@/lib/server/ledger";
import { parseRupees } from "@/lib/money";
import type { SubStatus } from "@/lib/orderState";
import { notifyFollowersOfNewProduct } from "@/lib/server/social";

const uuid = z.string().uuid();
const back = (fd: FormData, fallback: string) => {
  const b = String(fd.get("back") ?? "");
  return b.startsWith("/admin") ? b : fallback;
};

export async function sellerDecisionAction(fd: FormData) {
  const admin = await requireAdmin("sellers");
  const id = uuid.parse(fd.get("id"));
  const op = z.enum(["approve", "reject", "suspend", "reactivate", "review"]).parse(fd.get("op"));
  const reason = String(fd.get("reason") ?? "").trim();
  if ((op === "reject" || op === "suspend") && reason.length < 3) go(`/admin/sellers/${id}`, { err: "Please enter a reason." });
  const before = await q1<{ status: string; brand_name: string }>("select status, brand_name from seller_profiles where id = $1", [id]);
  if (!before) go("/admin/sellers", { err: "Seller not found." });
  const status = { approve: "approved", reactivate: "approved", reject: "rejected", suspend: "suspended", review: "under_review" }[op];
  if (op === "approve" || op === "reactivate") {
    const docs = await q1<{ n: number }>("select count(*)::int n from seller_documents where seller_id = $1", [id]);
    if (op === "approve" && !docs?.n) go(`/admin/sellers/${id}`, { err: "Verification documents haven't been uploaded yet." });
  }
  await q("update seller_profiles set status = $2, reviewed_by = $3, reviewed_at = now(), rejection_reason = $4 where id = $1", [id, status, admin.id, reason || null]);
  if (op === "suspend") await q("update products set status = 'paused' where seller_id = $1 and status = 'approved'", [id]);
  await audit(admin.id, `seller_${op}`, "seller", id, { status, reason }, { status: before.status });
  await notifySeller(id, `seller_${status === "approved" ? "approved" : status === "rejected" ? "rejected" : "suspended"}`, { reason });
  revalidatePath("/", "layout");
  go(`/admin/sellers/${id}`, { msg: `Seller ${status.replace("_", " ")}.` });
}

export async function sellerCommissionAction(fd: FormData) {
  const admin = await requireAdmin("finance");
  const id = uuid.parse(fd.get("id"));
  const raw = String(fd.get("percent") ?? "").trim();
  const pct = raw === "" ? null : Number(raw);
  if (pct !== null && (!(pct >= 0 && pct <= 50))) go(`/admin/sellers/${id}`, { err: "Commission must be between 0 and 50%." });
  await q("update seller_profiles set commission_bps = $2 where id = $1", [id, pct === null ? null : Math.round(pct * 100)]);
  await audit(admin.id, "seller_commission", "seller", id, { percent: pct });
  go(`/admin/sellers/${id}`, { msg: pct === null ? "Using the default commission." : `Commission set to ${pct}% for new orders.` });
}

export async function productDecisionAction(fd: FormData) {
  const admin = await requireAdmin("products");
  const id = uuid.parse(fd.get("id"));
  const op = z.enum(["approve", "reject", "feature", "unfeature", "remove", "pause"]).parse(fd.get("op"));
  const reason = String(fd.get("reason") ?? "").trim();
  const dest = back(fd, "/admin/products");
  const p = await q1<{ title: string; seller_id: string; status: string }>("select title, seller_id, status from products where id = $1", [id]);
  if (!p) go(dest, { err: "Product not found." });
  if (op === "reject" && reason.length < 3) go(dest, { err: "Please give the seller a reason." });
  if (op === "approve") {
    if (p.status !== "pending_approval") go(dest, { err: "Only products awaiting approval can be approved." });
    await q("update products set status = 'approved', rejection_reason = null where id = $1", [id]);
    await notifySeller(p.seller_id, "product_approved", { title: p.title });
    const brand = (await q1<{ brand_name: string }>("select brand_name from seller_profiles where id = $1", [p.seller_id]))?.brand_name ?? "A maker you follow";
    await notifyFollowersOfNewProduct(p.seller_id, id, p.title, brand);
  } else if (op === "reject") {
    await q("update products set status = 'rejected', rejection_reason = $2 where id = $1", [id, reason]);
    await notifySeller(p.seller_id, "product_rejected", { title: p.title, reason });
  } else if (op === "feature" || op === "unfeature") await q("update products set featured = $2 where id = $1", [id, op === "feature"]);
  else if (op === "pause") await q("update products set status = 'paused' where id = $1", [id]);
  else await q("update products set status = 'archived' where id = $1", [id]);
  await audit(admin.id, `product_${op}`, "product", id, { reason }, { status: p.status });
  revalidatePath("/", "layout");
  go(dest, { msg: "Done." });
}

export async function orderAdminAction(fd: FormData) {
  const admin = await requireAdmin("orders");
  const id = uuid.parse(fd.get("id"));
  const op = z.enum(["cancel", "refund", "return_approve", "return_reject", "courier_next", "courier_fail"]).parse(fd.get("op"));
  const order = z.string().regex(/^ORD-\d+$/).parse(fd.get("order"));
  const dest = `/admin/orders/${order}`;
  let r: { ok: boolean; error?: string } = { ok: true };
  if (op === "cancel") r = await adminCancel(admin.id, id);
  else if (op === "refund") { await requireAdmin("refunds"); r = await adminRefund(admin.id, id); }
  else if (op === "return_approve" || op === "return_reject") r = await decideReturn(admin.id, id, op === "return_approve");
  else {
    if (!demoMode()) go(dest, { err: "Courier simulation is disabled." });
    // "Courier webhook" simulation: same code path the real webhook endpoint uses.
    const row = await q1<{ awb: string; status: SubStatus }>("select sh.awb, so.status from shipments sh join seller_suborders so on so.id = sh.suborder_id where sh.suborder_id = $1", [id]);
    if (!row) go(dest, { err: "No shipment yet." });
    const next = op === "courier_fail" ? "delivery_failed" : NEXT_COURIER[row.status];
    if (!next) go(dest, { err: "No further courier step from this status." });
    await applyCourierEvent(row.awb, next, "Simulated", `sim-${Date.now()}`);
  }
  revalidatePath("/", "layout");
  go(dest, r.ok ? { msg: "Done." } : { err: r.error });
}

export async function settleAction(fd: FormData) {
  const admin = await requireAdmin("finance");
  const id = uuid.parse(fd.get("id"));
  // payouts are simulated: on a live site this would record money as paid when none was sent
  if (!demoMode()) go("/admin/finance", { err: "Payouts aren't available until a payout provider is connected." });
  const r = await settleSeller(id);
  if (r.ok) await audit(admin.id, "settlement", "seller", id, { amount_paise: r.amount });
  go("/admin/finance", r.ok ? { msg: "Settlement paid." } : { err: r.error });
}

export async function customerStatusAction(fd: FormData) {
  const admin = await requireAdmin("customers");
  const id = uuid.parse(fd.get("id"));
  const status = z.enum(["active", "suspended"]).parse(fd.get("status"));
  if (id === admin.id) go("/admin/customers", { err: "You can't suspend yourself." });
  await q("update users set status = $2 where id = $1", [id, status]);
  if (status === "suspended") await q("delete from sessions where user_id = $1", [id]);
  await audit(admin.id, `user_${status}`, "user", id);
  go("/admin/customers", { msg: status === "suspended" ? "Account suspended." : "Account reactivated." });
}

export async function couponAction(fd: FormData) {
  const admin = await requireAdmin("coupons");
  const op = String(fd.get("op"));
  if (op === "toggle") {
    await q("update coupons set active = not active where id = $1", [uuid.parse(fd.get("id"))]);
    go("/admin/coupons");
  }
  const p = parseForm(z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, "Code: 3–20 letters/numbers."),
    kind: z.enum(["percent", "fixed", "first_order"]), value: z.string().refine((v) => Number(v) > 0, "Enter a discount value."),
    min: z.string().optional(), max: z.string().optional(), limit: z.string().optional(), perUser: z.coerce.number().int().min(1).default(1),
    category: z.string().optional(), seller: z.string().optional(), ends: z.string().optional(),
  }), fd);
  if (!p.ok) go("/admin/coupons", { err: p.error });
  const d = p.data;
  const value = d.kind === "fixed" ? parseRupees(d.value) : Math.round(Number(d.value));
  if (!value || (d.kind !== "fixed" && value > 100)) go("/admin/coupons", { err: d.kind === "fixed" ? "Enter a valid ₹ amount." : "Percent must be 1–100." });
  try {
    await q(`insert into coupons (code, kind, value, min_order_paise, max_discount_paise, usage_limit, per_user_limit, category_id, seller_id, ends_at)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [d.code, d.kind, value, d.min ? parseRupees(d.min) ?? 0 : 0, d.max ? parseRupees(d.max) : null, d.limit ? Number(d.limit) : null, d.perUser,
        d.category && z.string().uuid().safeParse(d.category).success ? d.category : null, d.seller && z.string().uuid().safeParse(d.seller).success ? d.seller : null, d.ends ? new Date(d.ends + "T23:59:59") : null]);
  } catch { go("/admin/coupons", { err: "That code already exists." }); }
  await audit(admin.id, "coupon_create", "coupon", null, { code: d.code });
  go("/admin/coupons", { msg: `Coupon ${d.code} created.` });
}

export async function categoryAction(fd: FormData) {
  const admin = await requireAdmin("content");
  const op = String(fd.get("op"));
  if (op === "toggle") await q("update categories set active = not active where id = $1", [uuid.parse(fd.get("id"))]);
  else {
    const name = String(fd.get("name") ?? "").trim();
    if (name.length < 2) go("/admin/content", { err: "Enter a category name." });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await q("insert into categories (slug, name, sort_order) values ($1,$2,(select coalesce(max(sort_order),0)+1 from categories)) on conflict (slug) do nothing", [slug, name]);
  }
  await audit(admin.id, `category_${op}`, "category", null);
  revalidatePath("/", "layout");
  go("/admin/content", { msg: "Saved." });
}

export async function collectionAction(fd: FormData) {
  const admin = await requireAdmin("content");
  const op = String(fd.get("op"));
  if (op === "toggle") await q("update collections set active = not active where id = $1", [uuid.parse(fd.get("id"))]);
  else if (op === "add") {
    const title = String(fd.get("title") ?? "").trim();
    if (title.length < 2) go("/admin/content", { err: "Enter a collection title." });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await q("insert into collections (slug, title, description) values ($1,$2,$3) on conflict (slug) do nothing", [slug, title, String(fd.get("description") ?? "") || null]);
  } else if (op === "addProduct") {
    await q("insert into collection_products (collection_id, product_id) values ($1,$2) on conflict do nothing", [uuid.parse(fd.get("collectionId")), uuid.parse(fd.get("productId"))]);
  }
  await audit(admin.id, `collection_${op}`, "collection", null);
  revalidatePath("/", "layout");
  go("/admin/content", { msg: "Saved." });
}

export async function settingsAction(fd: FormData) {
  const admin = await requireAdmin("finance");
  const p = parseForm(z.object({
    commission: z.coerce.number().min(0).max(50), window: z.coerce.number().int().min(0).max(60),
    base: z.string().refine((v) => parseRupees(v) !== null, "Invalid base shipping."), per: z.string().refine((v) => parseRupees(v) !== null, "Invalid per-500g shipping."),
    free: z.string().refine((v) => v === "" || parseRupees(v) !== null, "Invalid free-shipping threshold."),
  }), fd);
  if (!p.ok) go("/admin/content", { err: p.error });
  const d = p.data;
  const kv: [string, string][] = [["default_commission_bps", String(Math.round(d.commission * 100))], ["return_window_days", String(d.window)], ["shipping_base_paise", String(parseRupees(d.base))], ["shipping_per_500g_paise", String(parseRupees(d.per))], ["free_shipping_over_paise", String(d.free ? parseRupees(d.free) : 0)]];
  for (const [k, v] of kv) await q("insert into settings (key, value) values ($1,$2) on conflict (key) do update set value = excluded.value", [k, v]);
  await audit(admin.id, "settings_update", "settings", null, Object.fromEntries(kv));
  go("/admin/content", { msg: "Settings saved. They apply to new orders." });
}

export async function ticketAction(fd: FormData) {
  const admin = await requireAdmin("customers");
  const id = uuid.parse(fd.get("id"));
  const status = z.enum(["open", "pending", "resolved", "closed"]).parse(fd.get("status"));
  const t = await q1<{ user_id: string; subject: string }>("update support_tickets set status = $2 where id = $1 returning user_id, subject", [id, status]);
  if (t && status === "resolved") await notify(t.user_id, "customer_complaint", { subject: `Resolved: ${t.subject}` });
  await audit(admin.id, "ticket_" + status, "ticket", id);
  go("/admin/support");
}
