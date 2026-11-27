import { q, q1, type Queryable } from "./db";
import { notify } from "./notify";
import { isUuid } from "./catalog";

// ───────── follows ─────────
export async function followedIds(userId?: string): Promise<Set<string>> {
  if (!userId) return new Set();
  return new Set((await q<{ seller_id: string }>("select seller_id from follows where user_id = $1", [userId])).map((r) => r.seller_id));
}
export async function toggleFollow(userId: string, sellerId: string): Promise<boolean> {
  const del = await q("delete from follows where user_id = $1 and seller_id = $2 returning seller_id", [userId, sellerId]);
  if (del.length) return false;
  await q("insert into follows (user_id, seller_id) select $1, id from seller_profiles where id = $2 and status = 'approved' on conflict do nothing", [userId, sellerId]);
  return true;
}

// ───────── moodboards ─────────
export type Board = { id: string; name: string; is_public: boolean; n: number; covers: string[] };
export async function myBoards(userId: string): Promise<Board[]> {
  return q<Board>(
    `select b.id, b.name, b.is_public, (select count(*)::int from moodboard_items mi where mi.board_id = b.id) n,
       coalesce((select array_agg(url) from (select i.url from moodboard_items mi join product_images i on i.product_id = mi.product_id and i.position = 0
         where mi.board_id = b.id order by mi.added_at desc limit 4) x), '{}') covers
     from moodboards b where b.user_id = $1 order by b.created_at desc`, [userId]);
}
export async function boardWithItems(id: string) {
  if (!isUuid(id)) return undefined;
  const b = await q1<{ id: string; name: string; is_public: boolean; user_id: string; owner: string | null }>(
    "select b.id, b.name, b.is_public, b.user_id, u.full_name owner from moodboards b join users u on u.id = b.user_id where b.id = $1", [id]);
  if (!b) return undefined;
  const ids = (await q<{ product_id: string }>("select product_id from moodboard_items where board_id = $1 order by added_at desc", [id])).map((r) => r.product_id);
  return { ...b, ids };
}

// ───────── notification preferences ─────────
export type Prefs = { wishlist_alerts: boolean; followed_artisans: boolean; weekly_drops: boolean; order_updates: boolean };
export async function getPrefs(userId: string): Promise<Prefs> {
  return (await q1<Prefs>("select wishlist_alerts, followed_artisans, weekly_drops, order_updates from notification_preferences where user_id = $1", [userId]))
    ?? { wishlist_alerts: true, followed_artisans: true, weekly_drops: false, order_updates: true };
}

// ───────── repeat-visit notifications (only to people who asked for them) ─────────
/** Tell followers (who allow it) about a newly approved piece. */
export async function notifyFollowersOfNewProduct(sellerId: string, productId: string, title: string, brand: string, db?: Queryable) {
  const rows = await q<{ user_id: string }>(
    `select f.user_id from follows f left join notification_preferences np on np.user_id = f.user_id
     where f.seller_id = $1 and coalesce(np.followed_artisans, true)`, [sellerId], db);
  for (const r of rows) await notify(r.user_id, "followed_new_product", { title, brand, product: productId }, `fnp-${productId}-${r.user_id}`, db);
}

/** Wishlist price-drop / back-in-stock alerts. Deduped per event so re-saving never spams. */
export async function notifyWishlisters(productId: string, kind: "price_drop" | "back_in_stock", payload: Record<string, unknown>, db?: Queryable) {
  const rows = await q<{ user_id: string }>(
    `select w.user_id from wishlist_items wi join wishlists w on w.id = wi.wishlist_id left join notification_preferences np on np.user_id = w.user_id
     where wi.product_id = $1 and coalesce(np.wishlist_alerts, true)`, [productId], db);
  const stamp = new Date().toISOString().slice(0, 13); // at most one alert of a kind per hour per person
  for (const r of rows) await notify(r.user_id, kind, { ...payload, product: productId }, `${kind}-${productId}-${r.user_id}-${stamp}`, db);
}

// ───────── personalisation signals ─────────
/** What this person has shown interest in: wishlist, boards, past orders and followed makers. */
export async function interestSignals(userId: string) {
  const cats = await q<{ c: string }>(
    `select distinct p.category_id c from products p where p.id in (
       select wi.product_id from wishlist_items wi join wishlists w on w.id = wi.wishlist_id where w.user_id = $1
       union select mi.product_id from moodboard_items mi join moodboards b on b.id = mi.board_id where b.user_id = $1
       union select oi.product_id from order_items oi join seller_suborders so on so.id = oi.suborder_id join parent_orders po on po.id = so.parent_order_id where po.buyer_id = $1)`, [userId]);
  const moods = await q<{ m: string }>(
    `select distinct unnest(p.moods) m from products p where p.id in (
       select wi.product_id from wishlist_items wi join wishlists w on w.id = wi.wishlist_id where w.user_id = $1
       union select mi.product_id from moodboard_items mi join moodboards b on b.id = mi.board_id where b.user_id = $1)`, [userId]);
  const sellers = await q<{ s: string }>("select seller_id s from follows where user_id = $1", [userId]);
  return { cats: cats.map((c) => c.c), moods: moods.map((m) => m.m), sellers: sellers.map((s) => s.s) };
}
