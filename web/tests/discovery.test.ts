import { describe, it, expect, vi, beforeAll } from "vitest";

process.env.DATA_DIR = "memory://";
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error("redirect " + u); } }));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T>(f: T) => f }));

import { q, q1 } from "@/lib/server/db";
import { DEMO } from "@/lib/server/seed";
import { listProducts, productsByIds, getSellerBySlug, getCollections } from "@/lib/server/catalog";
import { toggleFollow, followedIds, notifyFollowersOfNewProduct, notifyWishlisters, interestSignals, boardWithItems } from "@/lib/server/social";
import { toggleWishlist } from "@/lib/server/wishlist";

let buyer: string; let other: string;
const idOf = async (title: string) => (await q1<{ id: string }>("select id from products where title = $1", [title]))!.id;

beforeAll(async () => {
  buyer = (await q1<{ id: string }>("select id from users where email = $1", [DEMO.buyer.email]))!.id;
  other = (await q1<{ id: string }>("insert into users (email, full_name) values ('other@x.test','Other') returning id"))!.id;
});

describe("follows", () => {
  it("follow / unfollow and counts", async () => {
    const mitti = (await getSellerBySlug("mitti-studio"))!;
    expect(mitti.location).toBe("Khurja, Uttar Pradesh");
    expect(await toggleFollow(buyer, mitti.id)).toBe(true);
    expect((await followedIds(buyer)).has(mitti.id)).toBe(true);
    expect((await getSellerBySlug("mitti-studio"))!.followers).toBe(1);
    expect(await toggleFollow(buyer, mitti.id)).toBe(false);
    expect((await getSellerBySlug("mitti-studio"))!.followers).toBe(0);
  });

  it("only notifies followers who allow it", async () => {
    const mitti = (await getSellerBySlug("mitti-studio"))!;
    await toggleFollow(buyer, mitti.id); await toggleFollow(other, mitti.id);
    await q("insert into notification_preferences (user_id, followed_artisans) values ($1,false)", [other]);
    const pid = await idOf("Raku Fired Vase");
    await notifyFollowersOfNewProduct(mitti.id, pid, "Raku Fired Vase", "Mitti Studio");
    await notifyFollowersOfNewProduct(mitti.id, pid, "Raku Fired Vase", "Mitti Studio"); // duplicate publish
    expect((await q("select 1 from notifications where user_id = $1 and type = 'followed_new_product'", [buyer])).length).toBe(1);
    expect((await q("select 1 from notifications where user_id = $1", [other])).length).toBe(0);
  });
});

describe("wishlist alerts", () => {
  it("records the saved price and alerts once, honouring preferences", async () => {
    const pid = await idOf("Terracotta Planter Trio");
    expect(await toggleWishlist(buyer, pid)).toBe(true);
    const saved = await q1<{ price_at_save: number }>("select price_at_save from wishlist_items where product_id = $1", [pid]);
    expect(saved!.price_at_save).toBe(149900);
    await notifyWishlisters(pid, "price_drop", { title: "Terracotta Planter Trio", price_paise: 129900, was_paise: 149900 });
    await notifyWishlisters(pid, "price_drop", { title: "Terracotta Planter Trio", price_paise: 129900, was_paise: 149900 });
    expect((await q("select 1 from notifications where user_id = $1 and type = 'price_drop'", [buyer])).length).toBe(1);
    // switching alerts off stops them
    await q("insert into notification_preferences (user_id, wishlist_alerts) values ($1,false)", [buyer]);
    await notifyWishlisters(pid, "back_in_stock", { title: "x" });
    expect((await q("select 1 from notifications where user_id = $1 and type = 'back_in_stock'", [buyer])).length).toBe(0);
    expect(await toggleWishlist(buyer, pid)).toBe(false);
  });
});

describe("discovery queries", () => {
  it("filters by mood, one-of-a-kind and recency, and only labels what is true", async () => {
    const earthy = await listProducts({ mood: "earthy", pageSize: 50 });
    expect(earthy.total).toBeGreaterThan(0);
    expect(earthy.rows.every((p) => p.moods.includes("earthy"))).toBe(true);
    const one = await listProducts({ oneOfAKind: true, pageSize: 50 });
    expect(one.rows.map((p) => p.title).sort()).toEqual(["Lotus Terracotta Pendant Set", "Pattachitra Tree of Life", "Raku Fired Vase", "Silver Leaf Ring"]);
    expect(one.rows.every((p) => p.stock === 1)).toBe(true); // "only one" is a fact, not a claim
    const fresh = await listProducts({ isNew: true, pageSize: 50 });
    expect(fresh.rows.every((p) => p.is_new)).toBe(true);
    const old = await listProducts({ pageSize: 50 });
    expect(old.rows.some((p) => !p.is_new)).toBe(true);
  });

  it("personalises by what you saved and the makers you follow", async () => {
    await q("delete from follows where user_id = $1", [other]); // start from a clean slate
    const jewellery = await idOf("Silver Filigree Earrings");
    await toggleWishlist(other, jewellery);
    const tarakasi = (await getSellerBySlug("tarakasi-works"))!;
    const sig = await interestSignals(other);
    expect(sig.moods).toEqual(expect.arrayContaining(["traditional"]));
    const res = await listProducts({ sort: "for-you", prefs: sig, pageSize: 6 });
    expect(res.rows[0].category_slug === "handmade-jewellery" || res.rows[0].moods.includes("traditional")).toBe(true);
    // following a maker lifts that maker's work to the top
    await toggleFollow(other, tarakasi.id);
    const sig2 = await interestSignals(other);
    const res2 = await listProducts({ sort: "for-you", prefs: sig2, pageSize: 3 });
    expect(res2.rows.every((p) => p.seller_id === tarakasi.id || p.category_slug === "handmade-jewellery")).toBe(true);
    // a brand-new visitor gets no personalisation but still sees a stable feed
    expect((await listProducts({ sort: "daily", pageSize: 5 })).rows).toHaveLength(5);
  });

  it("recently viewed keeps order and ignores junk", async () => {
    const a = await idOf("Neem Wood Comb"), b = await idOf("Indigo Cushion Cover");
    const rows = await productsByIds([b, "not-a-uuid", a]);
    expect(rows.map((r) => r.id)).toEqual([b, a]);
    expect(await productsByIds([])).toEqual([]);
  });

  it("homepage collections include the weekly drop and real counts", async () => {
    const cols = await getCollections();
    const drop = cols.find((c) => c.kind === "drop")!;
    expect(drop.n).toBe(5);
    expect(cols.filter((c) => c.kind === "curated").length).toBeGreaterThanOrEqual(5);
  });
});

describe("moodboards", () => {
  it("private boards stay private to the data layer's owner check; items are unique", async () => {
    const b = (await q1<{ id: string }>("insert into moodboards (user_id, name) values ($1,'Kitchen') returning id", [buyer]))!;
    const pid = await idOf("Glazed Ceramic Mug Set");
    await q("insert into moodboard_items (board_id, product_id) values ($1,$2) on conflict do nothing", [b.id, pid]);
    await q("insert into moodboard_items (board_id, product_id) values ($1,$2) on conflict do nothing", [b.id, pid]);
    const board = await boardWithItems(b.id);
    expect(board?.ids).toEqual([pid]);
    expect(board?.is_public).toBe(false);
    expect(await boardWithItems("nope")).toBeUndefined();
  });
});
