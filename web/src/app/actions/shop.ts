"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getUser, requireUser } from "@/lib/server/auth";
import { addToCart, removeItem, saveForLater, setCoupon, setQuantity, getCartSummary } from "@/lib/server/cart";
import { toggleWishlist } from "@/lib/server/wishlist";
import { go, parseForm, safeNext } from "@/lib/server/form";
import { placeOrder } from "@/lib/server/orders";
import { demoMode } from "@/lib/server/env";
import { simulateGatewayEvent } from "@/lib/server/payments";
import { q, q1 } from "@/lib/server/db";
import { evaluateCoupon } from "@/lib/server/coupons";

export async function addToCartAction(fd: FormData) {
  const p = parseForm(z.object({ variantId: z.string().uuid(), qty: z.coerce.number().int().min(1).max(20).default(1), back: z.string().optional(), buyNow: z.string().optional() }), fd);
  const back = safeNext(fd.get("back"), "/cart");
  if (!p.ok) go(back, { err: "Couldn't add that item." });
  const r = await addToCart(p.data.variantId, p.data.qty);
  if (!r.ok) go(back, { err: r.error });
  revalidatePath("/", "layout");
  if (p.data.buyNow) go("/checkout");
  go("/cart", r.error ? { msg: r.error } : undefined);
}

export async function cartItemAction(fd: FormData) {
  const itemId = z.string().uuid().safeParse(fd.get("itemId"));
  if (!itemId.success) go("/cart");
  const op = String(fd.get("op"));
  if (op === "remove") await removeItem(itemId.data);
  else if (op === "save") await saveForLater(itemId.data, true);
  else if (op === "restore") await saveForLater(itemId.data, false);
  else if (op === "qty") await setQuantity(itemId.data, Number(fd.get("qty")));
  revalidatePath("/", "layout");
  go("/cart");
}

export async function couponAction(fd: FormData) {
  const code = String(fd.get("code") ?? "").trim();
  if (!code || fd.get("op") === "remove") { await setCoupon(null); go("/cart"); }
  const user = await getUser();
  const s = await getCartSummary();
  const r = await evaluateCoupon(code, user?.id ?? null, s.groups.flatMap((g) => g.lines).map((l) => ({ categoryId: l.categoryId, sellerId: l.sellerId, subtotal: l.unitPrice * l.quantity })));
  if (!r.ok) go("/cart", { err: r.error });
  await setCoupon(code.toUpperCase());
  go("/cart", { msg: `Coupon applied — you save ₹${r.discount / 100}.` });
}

export async function wishlistAction(fd: FormData) {
  const id = z.string().uuid().safeParse(fd.get("productId"));
  const back = safeNext(fd.get("back"), "/account/wishlist");
  if (!id.success) go(back);
  const user = await requireUser(back);
  await toggleWishlist(user.id, id.data);
  go(back);
}

export async function moveWishlistToCart(fd: FormData) {
  const user = await requireUser("/account/wishlist");
  const id = z.string().uuid().parse(fd.get("productId"));
  const v = await q1<{ id: string }>("select v.id from product_variants v where v.product_id = $1 and v.active order by v.label limit 1", [id]);
  if (v) {
    const r = await addToCart(v.id, 1);
    if (r.ok) { await toggleWishlist(user.id, id); revalidatePath("/", "layout"); go("/cart"); }
    go("/account/wishlist", { err: r.error });
  }
  go("/account/wishlist", { err: "Item unavailable." });
}

const address = z.object({
  name: z.string().trim().min(2, "Enter the recipient's name."),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  line1: z.string().trim().min(3, "Enter the address."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2, "Enter the city."),
  state: z.string().trim().min(2, "Enter the state."),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit PIN code."),
});

export async function saveAddressAction(fd: FormData) {
  const user = await requireUser("/account/addresses");
  const back = safeNext(fd.get("back"), "/account/addresses");
  const p = parseForm(address, fd);
  if (!p.ok) go(back, { err: p.error });
  const d = p.data;
  const first = !(await q1("select 1 from addresses where user_id = $1", [user.id]));
  await q("insert into addresses (user_id, kind, name, phone, line1, line2, city, state, pincode, is_default) values ($1,'shipping',$2,$3,$4,$5,$6,$7,$8,$9)",
    [user.id, d.name, d.phone, d.line1, d.line2 || null, d.city, d.state, d.pincode, first]);
  go(back, { msg: "Address saved." });
}

export async function deleteAddressAction(fd: FormData) {
  const user = await requireUser("/account/addresses");
  await q("delete from addresses where id = $1 and user_id = $2", [z.string().uuid().parse(fd.get("id")), user.id]);
  go("/account/addresses");
}

export async function placeOrderAction(fd: FormData) {
  const user = await requireUser("/checkout");
  if (!demoMode()) go("/checkout", { err: "Online payment isn't available yet." });
  const key = z.string().min(8).max(100).safeParse(fd.get("key"));
  if (!key.success) go("/checkout", { err: "Please try again." });
  let addr: z.infer<typeof address>;
  const saved = String(fd.get("addressId") ?? "");
  if (saved && saved !== "new") {
    const a = await q1<z.infer<typeof address>>("select name, phone, line1, line2, city, state, pincode from addresses where id = $1 and user_id = $2", [saved, user.id]);
    if (!a) go("/checkout", { err: "Choose a delivery address." });
    addr = { ...a, line2: a.line2 ?? undefined };
  } else {
    const p = parseForm(address, fd);
    if (!p.ok) go("/checkout", { err: p.error });
    addr = p.data;
    if (fd.get("saveAddress")) {
      const first = !(await q1("select 1 from addresses where user_id = $1", [user.id]));
      await q("insert into addresses (user_id, kind, name, phone, line1, line2, city, state, pincode, is_default) values ($1,'shipping',$2,$3,$4,$5,$6,$7,$8,$9)",
        [user.id, addr.name, addr.phone, addr.line1, addr.line2 || null, addr.city, addr.state, addr.pincode, first]);
    }
  }
  const r = await placeOrder(user.id, addr, key.data);
  if (!r.ok) go("/checkout", { err: r.error });
  revalidatePath("/", "layout");
  go(`/pay/${r.orderNumber}`);
}

/** Mock hosted payment page buttons. Emulates the gateway posting a signed webhook. */
export async function mockPayAction(fd: FormData) {
  const user = await requireUser();
  const order = z.string().regex(/^ORD-\d+$/).parse(fd.get("order"));
  const owned = await q1<{ pid: string }>(
    `select p.provider_payment_id pid from payments p join parent_orders po on po.id = p.parent_order_id
     where po.order_number = $1 and po.buyer_id = $2 order by p.created_at desc limit 1`, [order, user.id]);
  if (!owned) go("/account");
  const ok = fd.get("result") === "success";
  await simulateGatewayEvent(owned.pid, ok ? "payment.captured" : "payment.failed");
  revalidatePath("/", "layout");
  if (ok) go(`/account/orders/${order}`, { msg: "Payment successful. Thank you!" });
  go("/cart", { err: "Payment failed. Your items are still in stock — try again." });
}

/** Client-callable (no redirect) so the heart can toggle without losing the scroll position. */
export async function toggleWishlistJson(productId: string): Promise<{ status: "added" | "removed" | "login" | "error" }> {
  if (!z.string().uuid().safeParse(productId).success) return { status: "error" };
  const user = await getUser();
  if (!user) return { status: "login" };
  const saved = await toggleWishlist(user.id, productId);
  return { status: saved ? "added" : "removed" };
}
