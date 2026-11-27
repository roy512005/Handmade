import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { q, q1 } from "./db";
import { getUser } from "./auth";
import { getSettings, shippingFor } from "./shipping";
import { evaluateCoupon } from "./coupons";

export type CartLine = {
  itemId: string; variantId: string; productId: string; title: string; variantLabel: string;
  unitPrice: number; quantity: number; available: number; saved: boolean;
  imageUrl: string | null; sellerId: string; brand: string; categoryId: string; weight: number; sellable: boolean;
};

async function currentCartId(create: boolean): Promise<string | null> {
  const user = await getUser();
  const jar = await cookies();
  if (user) {
    let c = await q1<{ id: string }>("select id from carts where user_id = $1", [user.id]);
    if (!c && create) c = await q1<{ id: string }>("insert into carts (user_id) values ($1) returning id", [user.id]);
    return c?.id ?? null;
  }
  let token = jar.get("cart")?.value;
  if (!token) {
    if (!create) return null;
    token = randomBytes(16).toString("hex");
    jar.set("cart", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 86400 });
  }
  let c = await q1<{ id: string }>("select id from carts where guest_token = $1", [token]);
  if (!c && create) c = await q1<{ id: string }>("insert into carts (guest_token) values ($1) returning id", [token]);
  return c?.id ?? null;
}

/** After login: move guest cart items into the user's cart. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const token = jar.get("cart")?.value;
  if (!token) return;
  const guest = await q1<{ id: string }>("select id from carts where guest_token = $1", [token]);
  if (guest) {
    let mine = await q1<{ id: string }>("select id from carts where user_id = $1", [userId]);
    if (!mine) mine = await q1<{ id: string }>("insert into carts (user_id) values ($1) returning id", [userId]);
    await q(
      `insert into cart_items (cart_id, variant_id, quantity, saved_for_later)
       select $1, variant_id, quantity, saved_for_later from cart_items where cart_id = $2
       on conflict (cart_id, variant_id) do update set quantity = cart_items.quantity + excluded.quantity`, [mine!.id, guest.id]);
    await q("delete from carts where id = $1", [guest.id]);
  }
  jar.delete("cart");
}

export async function addToCart(variantId: string, qty: number): Promise<{ ok: boolean; error?: string }> {
  const v = await q1<{ available: number; ok: boolean }>(
    `select (i.on_hand - i.reserved)::int available, (p.status = 'approved' and s.status = 'approved' and v.active) ok
     from product_variants v join products p on p.id = v.product_id join seller_profiles s on s.id = p.seller_id
     join product_inventory i on i.variant_id = v.id where v.id = $1`, [variantId]);
  if (!v || !v.ok) return { ok: false, error: "This product is no longer available." };
  const cartId = (await currentCartId(true))!;
  const existing = await q1<{ quantity: number }>("select quantity from cart_items where cart_id = $1 and variant_id = $2", [cartId, variantId]);
  const want = (existing?.quantity ?? 0) + qty;
  if (v.available <= 0) return { ok: false, error: "Sorry, this item is out of stock." };
  const final = Math.min(want, v.available);
  await q(
    `insert into cart_items (cart_id, variant_id, quantity) values ($1,$2,$3)
     on conflict (cart_id, variant_id) do update set quantity = $3, saved_for_later = false`, [cartId, variantId, final]);
  return { ok: true, error: final < want ? `Only ${v.available} available — quantity adjusted.` : undefined };
}

async function ownItem(itemId: string) {
  const cartId = await currentCartId(false);
  return cartId ? q1<{ id: string }>("select id from cart_items where id = $1 and cart_id = $2", [itemId, cartId]) : undefined;
}
export async function setQuantity(itemId: string, qty: number) {
  if (!(await ownItem(itemId))) return;
  if (qty <= 0) await q("delete from cart_items where id = $1", [itemId]);
  else await q(
    `update cart_items ci set quantity = least($2, greatest(1, (select i.on_hand - i.reserved from product_inventory i where i.variant_id = ci.variant_id)))
     where ci.id = $1`, [itemId, qty]);
}
export async function removeItem(itemId: string) { if (await ownItem(itemId)) await q("delete from cart_items where id = $1", [itemId]); }
export async function saveForLater(itemId: string, saved: boolean) { if (await ownItem(itemId)) await q("update cart_items set saved_for_later = $2 where id = $1", [itemId, saved]); }

export async function setCoupon(code: string | null) {
  const cartId = await currentCartId(true);
  await q("update carts set coupon_code = $2 where id = $1", [cartId, code]);
}

export async function cartCount(): Promise<number> {
  const id = await currentCartId(false);
  if (!id) return 0;
  return (await q1<{ n: number }>("select coalesce(sum(quantity),0)::int n from cart_items where cart_id = $1 and not saved_for_later", [id]))?.n ?? 0;
}

export async function getCartLines(): Promise<{ cartId: string | null; lines: CartLine[]; couponCode: string | null }> {
  const cartId = await currentCartId(false);
  if (!cartId) return { cartId: null, lines: [], couponCode: null };
  const lines = await q<CartLine>(
    `select ci.id "itemId", v.id "variantId", p.id "productId", p.title, v.label "variantLabel",
            coalesce(v.price_paise, p.price_paise) "unitPrice", ci.quantity, (i.on_hand - i.reserved)::int available,
            ci.saved_for_later saved, (select url from product_images where product_id = p.id order by position limit 1) "imageUrl",
            s.id "sellerId", s.brand_name brand, p.category_id "categoryId", coalesce(p.weight_grams, 500) weight,
            (p.status = 'approved' and s.status = 'approved' and v.active) sellable
     from cart_items ci join product_variants v on v.id = ci.variant_id join products p on p.id = v.product_id
     join seller_profiles s on s.id = p.seller_id join product_inventory i on i.variant_id = v.id
     where ci.cart_id = $1 order by ci.id`, [cartId]);
  const c = await q1<{ coupon_code: string | null }>("select coupon_code from carts where id = $1", [cartId]);
  return { cartId, lines, couponCode: c?.coupon_code ?? null };
}

export type CartSummary = {
  groups: { sellerId: string; brand: string; lines: CartLine[]; subtotal: number; shipping: number; discount: number }[];
  subtotal: number; shipping: number; discount: number; total: number;
  couponCode: string | null; couponError: string | null; problems: string[]; saved: CartLine[]; count: number;
};

export async function getCartSummary(pin?: string): Promise<CartSummary> {
  void pin;
  const { lines, couponCode } = await getCartLines();
  const settings = await getSettings();
  const user = await getUser();
  const active = lines.filter((l) => !l.saved);
  const problems: string[] = [];
  for (const l of active) {
    if (!l.sellable) problems.push(`"${l.title}" is no longer available.`);
    else if (l.available < l.quantity) problems.push(`Only ${Math.max(0, l.available)} of "${l.title}" in stock.`);
  }
  const bySeller = new Map<string, CartLine[]>();
  for (const l of active.filter((x) => x.sellable)) bySeller.set(l.sellerId, [...(bySeller.get(l.sellerId) ?? []), l]);
  const groups = [...bySeller.entries()].map(([sellerId, ls]) => {
    const subtotal = ls.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
    const weight = ls.reduce((a, l) => a + l.weight * l.quantity, 0);
    return { sellerId, brand: ls[0].brand, lines: ls, subtotal, shipping: shippingFor(weight, subtotal, settings), discount: 0 };
  });
  let discount = 0;
  let couponError: string | null = null;
  if (couponCode && groups.length) {
    const r = await evaluateCoupon(couponCode, user?.id ?? null, active.filter((l) => l.sellable).map((l) => ({ categoryId: l.categoryId, sellerId: l.sellerId, subtotal: l.unitPrice * l.quantity })));
    if (r.ok) discount = r.discount; else couponError = r.error;
  }
  // spread discount across sellers in proportion to subtotal (last seller takes the remainder)
  const sub = groups.reduce((a, g) => a + g.subtotal, 0);
  let left = discount;
  groups.forEach((g, i) => {
    g.discount = i === groups.length - 1 ? left : Math.floor((discount * g.subtotal) / sub);
    left -= g.discount;
  });
  const shipping = groups.reduce((a, g) => a + g.shipping, 0);
  return {
    groups, subtotal: sub, shipping, discount, total: sub + shipping - discount,
    couponCode, couponError, problems, saved: lines.filter((l) => l.saved),
    count: active.reduce((a, l) => a + l.quantity, 0),
  };
}
