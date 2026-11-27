import { describe, it, expect, vi, beforeAll } from "vitest";

process.env.DATA_DIR = "memory://";
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (k: string) => (jar.has(k) ? { value: jar.get(k) } : undefined), set: (k: string, v: string) => void jar.set(k, v), delete: (k: string) => void jar.delete(k) }) }));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error("REDIRECT " + u); } }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T>(f: T) => f }));

import { q, q1 } from "@/lib/server/db";
import { DEMO } from "@/lib/server/seed";
import { createSession } from "@/lib/server/auth";
import { toggleWishlist } from "@/lib/server/wishlist";
import { saveProductAction, productStatusAction } from "@/app/actions/seller";
import { productDecisionAction } from "@/app/actions/admin";
import { toggleFollow } from "@/lib/server/social";

let buyer: string;
async function editForm(productId: string, over: Record<string, string>) {
  const p = (await q1<Record<string, unknown>>("select * from products where id = $1", [productId]))!;
  const fd = new FormData();
  const base: Record<string, string> = {
    id: productId, title: String(p.title), categoryId: String(p.category_id), description: String(p.description), materials: (p.materials as string[]).join(", "),
    price: String(Number(p.price_paise) / 100), weight: String(p.weight_grams), processingDays: String(p.processing_days), variants: "Default | 5",
  };
  for (const [k, v] of Object.entries({ ...base, ...over })) fd.set(k, v);
  return fd;
}
async function asUser(email: string) { jar.clear(); const u = (await q1<{ id: string }>("select id from users where email = $1", [email]))!; await createSession(u.id); return u.id; }
async function run(fn: () => Promise<unknown>) { try { await fn(); } catch (e) { if (!String((e as Error).message).startsWith("REDIRECT")) throw e; return (e as Error).message; } }

beforeAll(async () => { buyer = (await q1<{ id: string }>("select id from users where email = $1", [DEMO.buyer.email]))!.id; });

describe("seller edits trigger the right alerts", () => {
  it("price drop reaches people who saved the piece; a price rise does not", async () => {
    const pid = (await q1<{ id: string }>("select id from products where title = 'Madhubani Wall Painting'"))!.id;
    await toggleWishlist(buyer, pid);
    await asUser("kashth@handmade.test");
    const msg = await run(async () => saveProductAction(await editForm(pid, { price: "2999", variants: "Default | 5" })));
    expect(msg).toMatch(/REDIRECT \/seller\/products\//);
    const n = await q<{ type: string; payload: { price_paise: number; was_paise: number } }>("select type, payload from notifications where user_id = $1 and type = 'price_drop'", [buyer]);
    expect(n).toHaveLength(1);
    expect(n[0].payload).toMatchObject({ price_paise: 299900, was_paise: 349900 });
    await run(async () => saveProductAction(await editForm(pid, { price: "3200", variants: "Default | 5" })));
    expect((await q("select 1 from notifications where user_id = $1 and type = 'price_drop'", [buyer])).length).toBe(1);
  });

  it("restock alerts only fire when it goes from sold out to available", async () => {
    const pid = (await q1<{ id: string }>("select id from products where title = 'Raku Fired Vase'"))!.id;
    await toggleWishlist(buyer, pid);
    await asUser("seller@handmade.test");
    await run(async () => saveProductAction(await editForm(pid, { variants: "Default | 0" })));
    expect((await q("select 1 from notifications where user_id = $1 and type = 'back_in_stock'", [buyer])).length).toBe(0);
    await run(async () => saveProductAction(await editForm(pid, { variants: "Default | 1" })));
    expect((await q("select 1 from notifications where user_id = $1 and type = 'back_in_stock'", [buyer])).length).toBe(1);
  });

  it("admin approval of a new piece notifies followers only", async () => {
    const mitti = (await q1<{ id: string }>("select id from seller_profiles where slug = 'mitti-studio'"))!.id;
    await toggleFollow(buyer, mitti);
    await asUser("seller@handmade.test");
    const cat = (await q1<{ id: string }>("select id from categories limit 1"))!.id;
    const fd = new FormData();
    for (const [k, v] of Object.entries({ title: "Test Celadon Cup", categoryId: cat, description: "A pale celadon cup, thrown by hand and glazed in small batches.", price: "450", weight: "300", processingDays: "3", variants: "Default | 4" })) fd.set(k, v);
    const dest = (await run(() => saveProductAction(fd)))!;
    const newId = dest.split("/").pop()!.split("?")[0];
    await q("insert into product_images (product_id, url, position) values ($1,'/art/mug-9.svg',0)", [newId]);
    const sub = new FormData(); sub.set("id", newId); sub.set("op", "submit");
    await run(() => productStatusAction(sub));
    await asUser(DEMO.admin.email);
    const ap = new FormData(); ap.set("id", newId); ap.set("op", "approve");
    await run(() => productDecisionAction(ap));
    const got = await q<{ payload: { title: string } }>("select payload from notifications where user_id = $1 and type = 'followed_new_product'", [buyer]);
    expect(got.map((g) => g.payload.title)).toContain("Test Celadon Cup");
  });
});
