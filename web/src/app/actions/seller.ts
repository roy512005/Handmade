"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireApprovedSeller, requireSeller } from "@/lib/server/auth";
import { q, q1, tx, type Queryable } from "@/lib/server/db";
import { go, parseForm } from "@/lib/server/form";
import { saveUpload } from "@/lib/server/uploads";
import { parseRupees } from "@/lib/money";
import { sellerAction, type SellerAction } from "@/lib/server/orders";
import { notifyAdmins } from "@/lib/server/notify";
import { notifyWishlisters } from "@/lib/server/social";
import { MOODS } from "@/lib/art";

const productSchema = z.object({
  title: z.string().trim().min(3, "Give the product a title (3+ characters).").max(120),
  categoryId: z.string().uuid("Choose a category."),
  description: z.string().trim().min(20, "Describe the product in at least a couple of sentences.").max(5000),
  materials: z.string().trim().max(300).optional(),
  price: z.string().refine((v) => parseRupees(v) !== null && parseRupees(v)! > 0, "Enter a valid price in ₹."),
  originalPrice: z.string().optional().refine((v) => !v || parseRupees(v) !== null, "Enter a valid original price."),
  weight: z.coerce.number().int("Weight must be a whole number of grams.").min(1, "Enter the packed weight in grams.").max(30000),
  length: z.coerce.number().min(0).max(300).optional(),
  width: z.coerce.number().min(0).max(300).optional(),
  height: z.coerce.number().min(0).max(300).optional(),
  processingDays: z.coerce.number().int().min(0).max(60),
  isCustom: z.string().optional(),
  oneOfAKind: z.string().optional(),
  processNote: z.string().trim().max(1500).optional(),
  variants: z.string().trim().min(1, "Add at least one stock line, e.g. Default | 10"),
});

type Variant = { label: string; stock: number; price: number | null };
function parseVariants(text: string): Variant[] | string {
  const out: Variant[] = [];
  for (const raw of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [label, stock, price] = raw.split("|").map((s) => s.trim());
    const st = Number(stock);
    if (!label || !Number.isInteger(st) || st < 0) return `Check this stock line: "${raw}" (format: Label | stock | optional price)`;
    const pr = price ? parseRupees(price) : null;
    if (price && pr === null) return `Invalid price on line: "${raw}"`;
    out.push({ label, stock: st, price: pr });
  }
  if (!out.length) return "Add at least one stock line.";
  if (new Set(out.map((v) => v.label.toLowerCase())).size !== out.length) return "Each option name must be unique.";
  return out;
}

async function saveVariants(db: Queryable, productId: string, variants: Variant[]) {
  const existing = await q<{ id: string; label: string; reserved: number }>(
    "select v.id, v.label, i.reserved from product_variants v join product_inventory i on i.variant_id = v.id where v.product_id = $1", [productId], db);
  for (const v of variants) {
    const ex = existing.find((e) => e.label.toLowerCase() === v.label.toLowerCase());
    if (ex) {
      await q("update product_variants set price_paise = $2, active = true, label = $3 where id = $1", [ex.id, v.price, v.label], db);
      await q("update product_inventory set on_hand = $2 where variant_id = $1", [ex.id, v.stock + ex.reserved], db);
    } else {
      const nv = (await q1<{ id: string }>("insert into product_variants (product_id, sku, label, price_paise) values ($1,$2,$3,$4) returning id", [productId, `${productId.slice(0, 8)}-${Math.random().toString(36).slice(2, 7)}`, v.label, v.price], db))!;
      await q("insert into product_inventory (variant_id, on_hand) values ($1,$2)", [nv.id, v.stock], db);
    }
  }
  const keep = new Set(variants.map((v) => v.label.toLowerCase()));
  for (const e of existing) if (!keep.has(e.label.toLowerCase())) await q("update product_variants set active = false where id = $1", [e.id], db);
}

export async function saveProductAction(fd: FormData) {
  const user = await requireApprovedSeller();
  const id = String(fd.get("id") ?? "");
  const back = id ? `/seller/products/${id}` : "/seller/products/new";
  const p = parseForm(productSchema, fd);
  if (!p.ok) go(back, { err: p.error });
  const d = p.data;
  const variants = parseVariants(d.variants);
  if (typeof variants === "string") go(back, { err: variants });
  const price = parseRupees(d.price)!;
  const orig = d.originalPrice ? parseRupees(d.originalPrice) : null;
  if (orig !== null && orig < price) go(back, { err: "Original price must be at least the selling price." });
  const dims = [d.length, d.width, d.height].map((x) => (x ? Math.round(x * 10) : null));
  const validMoods = MOODS.map((m) => m.key as string);
  const moods = fd.getAll("moods").map(String).filter((m) => validMoods.includes(m));
  const materials = (d.materials ?? "").split(",").map((m) => m.trim()).filter(Boolean);
  const cat = await q1("select 1 from categories where id = $1 and active", [d.categoryId]);
  if (!cat) go(back, { err: "Choose a category." });

  // images (validated by content, not name)
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 6) go(back, { err: "You can upload up to 6 images at a time." });
  const saved: string[] = [];
  for (const f of files) {
    const r = await saveUpload(f, {});
    if (!r.ok) go(back, { err: `${f.name}: ${r.error}` });
    saved.push(`/uploads/${r.name}`);
  }

  const alert: { kind: "price_drop" | "back_in_stock"; payload: Record<string, unknown> }[] = [];
  const meta: { before?: number; live?: boolean } = {};
  const productId = await tx(async (db) => {
    let pid = id;
    if (id) {
      const cur = await q1<{ status: string; title: string; description: string; price_paise: number }>("select status, title, description, price_paise from products where id = $1 and seller_id = $2", [id, user.sellerId], db);
      if (!cur) throw new Error("Product not found.");
      const before = (await q1<{ s: number }>("select coalesce(sum(i.on_hand - i.reserved),0)::int s from product_variants v join product_inventory i on i.variant_id = v.id where v.product_id = $1 and v.active", [id], db))!.s;
      const live = cur.status === "approved";
      if (live && price < cur.price_paise) alert.push({ kind: "price_drop", payload: { title: d.title, price_paise: price, was_paise: cur.price_paise } });
      meta.before = before; meta.live = live;
      // content edits to a live listing go back through review; stock/price edits don't
      const needsReview = cur.status === "approved" && (cur.title !== d.title || cur.description !== d.description);
      await q(
        `update products set title=$3, category_id=$4, description=$5, materials=$6, price_paise=$7, original_price_paise=$8, weight_grams=$9,
           length_mm=$10, width_mm=$11, height_mm=$12, processing_days=$13, is_custom=$14, status = case when $15 then 'pending_approval' else status end,
           moods=$16, one_of_a_kind=$17, process_note=$18
         where id = $1 and seller_id = $2`,
        [id, user.sellerId, d.title, d.categoryId, d.description, materials, price, orig, d.weight, dims[0], dims[1], dims[2], d.processingDays, !!d.isCustom, needsReview, moods, !!d.oneOfAKind, d.processNote || null], db);
      if (needsReview) await notifyAdmins("new_product_submission", { title: d.title }, db);
    } else {
      pid = (await q1<{ id: string }>(
        `insert into products (seller_id, category_id, title, description, materials, price_paise, original_price_paise, weight_grams, length_mm, width_mm, height_mm, processing_days, is_custom, moods, one_of_a_kind, process_note)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
        [user.sellerId, d.categoryId, d.title, d.description, materials, price, orig, d.weight, dims[0], dims[1], dims[2], d.processingDays, !!d.isCustom, moods, !!d.oneOfAKind, d.processNote || null], db))!.id;
    }
    await saveVariants(db, pid, variants);
    if (id) {
      const after = (await q1<{ s: number }>("select coalesce(sum(i.on_hand - i.reserved),0)::int s from product_variants v join product_inventory i on i.variant_id = v.id where v.product_id = $1 and v.active", [pid], db))!.s;
      if (meta.live && (meta.before ?? 1) <= 0 && after > 0) alert.push({ kind: "back_in_stock", payload: { title: d.title } });
    }
    // remove selected images
    for (const rid of fd.getAll("removeImage").map(String)) await q("delete from product_images where id = $1 and product_id = $2", [rid, pid], db);
    let pos = (await q1<{ n: number }>("select coalesce(max(position),-1)::int + 1 n from product_images where product_id = $1", [pid], db))!.n;
    for (const url of saved) await q("insert into product_images (product_id, url, alt, position) values ($1,$2,$3,$4)", [pid, url, d.title, pos++], db);
    return pid;
  }).catch((e) => go(back, { err: (e as Error).message }));

  for (const a of alert) await notifyWishlisters(productId, a.kind, a.payload);
  revalidatePath("/seller", "layout");
  go(`/seller/products/${productId}`, { msg: id ? "Saved." : "Product saved as a draft. Add photos, then submit it for approval." });
}

export async function productStatusAction(fd: FormData) {
  const user = await requireApprovedSeller();
  const id = z.string().uuid().parse(fd.get("id"));
  const op = String(fd.get("op"));
  const cur = await q1<{ status: string; title: string }>("select status, title from products where id = $1 and seller_id = $2", [id, user.sellerId]);
  if (!cur) go("/seller/products", { err: "Product not found." });
  const to = ({ submit: ["draft", "rejected", "paused"], pause: ["approved"], archive: ["draft", "rejected", "paused", "approved", "pending_approval"] } as Record<string, string[]>)[op];
  if (!to?.includes(cur.status)) go(`/seller/products/${id}`, { err: "That isn't possible in the product's current state." });
  if (op === "submit") {
    const imgs = await q1<{ n: number }>("select count(*)::int n from product_images where product_id = $1", [id]);
    if (!imgs?.n) go(`/seller/products/${id}`, { err: "Add at least one photo before submitting." });
    await q("update products set status = 'pending_approval', rejection_reason = null where id = $1", [id]);
    await notifyAdmins("new_product_submission", { title: cur.title });
  } else if (op === "pause") await q("update products set status = 'paused' where id = $1", [id]);
  else await q("update products set status = 'archived' where id = $1", [id]);
  revalidatePath("/seller", "layout");
  go(op === "archive" ? "/seller/products" : `/seller/products/${id}`, { msg: op === "submit" ? "Submitted for approval." : op === "pause" ? "Listing paused." : "Archived." });
}

export async function resumeProductAction(fd: FormData) {
  const user = await requireApprovedSeller();
  const id = z.string().uuid().parse(fd.get("id"));
  await q("update products set status = 'approved' where id = $1 and seller_id = $2 and status = 'paused'", [id, user.sellerId]);
  go(`/seller/products/${id}`, { msg: "Listing is live again." });
}

export async function orderActionAction(fd: FormData) {
  const user = await requireApprovedSeller();
  const id = z.string().uuid().parse(fd.get("id"));
  const action = z.enum(["accept", "reject", "prepare", "ready"]).parse(fd.get("action")) as SellerAction;
  const reason = String(fd.get("reason") ?? "").trim();
  if (action === "reject" && reason.length < 3) go(`/seller/orders/${id}`, { err: "Please give the buyer a short reason." });
  const r = await sellerAction(user.sellerId, id, action, reason);
  revalidatePath("/seller", "layout");
  go(`/seller/orders/${id}`, r.ok ? { msg: "Order updated." } : { err: r.error });
}

export async function updateSellerProfileAction(fd: FormData) {
  const user = await requireSeller();
  const p = parseForm(z.object({
    brand: z.string().trim().min(2, "Enter your brand name.").max(60), story: z.string().trim().max(2000).optional(),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
    line1: z.string().trim().min(3, "Enter the pickup address."), city: z.string().trim().min(2), state: z.string().trim().min(2),
    pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid pickup PIN code."),
  }), fd);
  if (!p.ok) go("/seller/profile", { err: p.error });
  const d = p.data;
  let image: string | null = null;
  const f = fd.get("image");
  if (f instanceof File && f.size > 0) {
    const r = await saveUpload(f, {});
    if (!r.ok) go("/seller/profile", { err: r.error });
    image = `/uploads/${r.name}`;
  }
  await tx(async (db) => {
    await q("update seller_profiles set brand_name = $2, story = $3, profile_image_url = coalesce($4, profile_image_url) where id = $1", [user.sellerId, d.brand, d.story || null, image], db);
    await q("update users set phone = $2 where id = $1", [user.id, d.phone], db);
    await q("update addresses set line1=$2, city=$3, state=$4, pincode=$5, phone=$6 where seller_id = $1 and kind = 'pickup'", [user.sellerId, d.line1, d.city, d.state, d.pincode, d.phone], db);
  });
  go("/seller/profile", { msg: "Profile saved." });
}

export async function uploadDocumentAction(fd: FormData) {
  const user = await requireSeller();
  const type = z.enum(["pan", "id_proof", "business_proof", "bank_proof"]).parse(fd.get("type"));
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) go("/seller/profile", { err: "Choose a file to upload." });
  const r = await saveUpload(f, { isPrivate: true, allowPdf: true });
  if (!r.ok) go("/seller/profile", { err: r.error });
  await q("insert into seller_documents (seller_id, doc_type, storage_path) values ($1,$2,$3)", [user.sellerId, type, r.name]);
  if (user.sellerStatus === "pending") await q("update seller_profiles set status = 'under_review' where id = $1 and status = 'pending'", [user.sellerId]);
  await notifyAdmins("new_seller_application", { brand: "documents uploaded" });
  go("/seller/profile", { msg: "Document uploaded securely." });
}
