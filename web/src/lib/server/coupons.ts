import { q, q1, type Queryable } from "./db";

export type CouponLine = { categoryId: string; sellerId: string; subtotal: number };
type Coupon = {
  id: string; code: string; kind: "percent" | "fixed" | "first_order"; value: number; min_order_paise: number;
  max_discount_paise: number | null; usage_limit: number | null; per_user_limit: number;
  category_id: string | null; seller_id: string | null; starts_at: string | null; ends_at: string | null; active: boolean;
};

export async function evaluateCoupon(code: string, userId: string | null, lines: CouponLine[], db?: Queryable):
  Promise<{ ok: true; couponId: string; discount: number } | { ok: false; error: string }> {
  const c = await q1<Coupon>("select * from coupons where upper(code) = upper($1)", [code.trim()], db);
  if (!c || !c.active) return { ok: false, error: "This coupon code isn't valid." };
  const now = Date.now();
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { ok: false, error: "This coupon isn't active yet." };
  if (c.ends_at && new Date(c.ends_at).getTime() < now) return { ok: false, error: "This coupon has expired." };

  const total = lines.reduce((a, l) => a + l.subtotal, 0);
  if (total < c.min_order_paise) return { ok: false, error: `Minimum order ₹${c.min_order_paise / 100} required for this coupon.` };

  const eligible = lines.filter((l) => (!c.category_id || l.categoryId === c.category_id) && (!c.seller_id || l.sellerId === c.seller_id))
    .reduce((a, l) => a + l.subtotal, 0);
  if (eligible <= 0) return { ok: false, error: "This coupon doesn't apply to items in your cart." };

  if (c.usage_limit !== null) {
    const used = (await q1<{ n: number }>("select count(*)::int n from coupon_redemptions where coupon_id = $1", [c.id], db))!.n;
    if (used >= c.usage_limit) return { ok: false, error: "This coupon has reached its usage limit." };
  }
  if (userId) {
    const mine = (await q1<{ n: number }>("select count(*)::int n from coupon_redemptions where coupon_id = $1 and user_id = $2", [c.id, userId], db))!.n;
    if (mine >= c.per_user_limit) return { ok: false, error: "You've already used this coupon." };
  }
  if (c.kind === "first_order") {
    if (!userId) return { ok: false, error: "Sign in to use a first-order coupon." };
    const prior = (await q1<{ n: number }>("select count(*)::int n from parent_orders where buyer_id = $1 and status <> 'placed'", [userId], db))!.n;
    if (prior > 0) return { ok: false, error: "This coupon is only for first orders." };
  }

  let d = c.kind === "fixed" ? c.value : Math.floor((eligible * c.value) / 100);
  d = Math.min(d, eligible);
  if (c.max_discount_paise !== null) d = Math.min(d, c.max_discount_paise);
  return { ok: true, couponId: c.id, discount: d };
}

export async function listCoupons() {
  return q<Coupon & { used: number }>(
    "select c.*, (select count(*)::int from coupon_redemptions r where r.coupon_id = c.id) used from coupons c order by c.code");
}
