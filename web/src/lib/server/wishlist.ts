import { q, q1 } from "./db";

export async function wishlistIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  const rows = await q<{ product_id: string }>(
    "select wi.product_id from wishlist_items wi join wishlists w on w.id = wi.wishlist_id where w.user_id = $1", [userId]);
  return new Set(rows.map((r) => r.product_id));
}

/** Returns true when the product is now saved. */
export async function toggleWishlist(userId: string, productId: string): Promise<boolean> {
  let w = await q1<{ id: string }>("select id from wishlists where user_id = $1", [userId]);
  if (!w) w = await q1<{ id: string }>("insert into wishlists (user_id) values ($1) returning id", [userId]);
  const del = await q("delete from wishlist_items where wishlist_id = $1 and product_id = $2 returning product_id", [w!.id, productId]);
  if (!del.length) {
    await q("insert into wishlist_items (wishlist_id, product_id, price_at_save) select $1, id, price_paise from products where id = $2 on conflict do nothing", [w!.id, productId]);
    return true;
  }
  return false;
}
