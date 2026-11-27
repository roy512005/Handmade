import { describe, it, expect, vi, beforeAll } from "vitest";

process.env.DATA_DIR = "memory://";
const state: { cookies: Map<string, string>; userId: string | null } = { cookies: new Map(), userId: null };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (state.cookies.has(k) ? { value: state.cookies.get(k) } : undefined),
    set: (k: string, v: string) => void state.cookies.set(k, v),
    delete: (k: string) => void state.cookies.delete(k),
  }),
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error("redirect " + u); } }));
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T>(f: T) => f }));

import { q, q1 } from "@/lib/server/db";
import { DEMO } from "@/lib/server/seed";
import { addToCart, getCartSummary, setCoupon } from "@/lib/server/cart";
import { placeOrder, sellerAction, applyCourierEvent, buyerCancel, requestReturn, decideReturn, adminRefund } from "@/lib/server/orders";
import { simulateGatewayEvent, handleWebhook, sign } from "@/lib/server/payments";
import { releaseDueLedger, sellerBalances, settleSeller } from "@/lib/server/ledger";
import { createSession } from "@/lib/server/auth";

const addr = { name: "A", phone: "9999999999", line1: "1 Road", city: "Pune", state: "MH", pincode: "411001" };
let buyerId: string;

async function variantOf(title: string) {
  return (await q1<{ id: string; seller_id: string }>(
    "select v.id, p.seller_id from product_variants v join products p on p.id = v.product_id where p.title = $1", [title]))!;
}
async function stock(variantId: string) {
  return (await q1<{ on_hand: number; reserved: number }>("select on_hand, reserved from product_inventory where variant_id = $1", [variantId]))!;
}

beforeAll(async () => {
  buyerId = (await q1<{ id: string }>("select id from users where email = $1", [DEMO.buyer.email]))!.id;
  // log in as the buyer: createSession sets the cookie via the mocked jar
  await createSession(buyerId);
});

describe("marketplace flow", () => {
  it("multi-seller checkout → suborders → payment webhook → ledger", async () => {
    const lamp = await variantOf("Hand-thrown Terracotta Lamp");
    const tote = await variantOf("Block-printed Cotton Tote");
    await addToCart(lamp.id, 1);
    await addToCart(tote.id, 2);
    await setCoupon("WELCOME10");
    const s = await getCartSummary();
    expect(s.groups).toHaveLength(2);
    expect(s.subtotal).toBe(189900 + 2 * 79900);
    expect(s.discount).toBe(Math.floor(s.subtotal * 0.1) > 30000 ? 30000 : Math.floor(s.subtotal * 0.1));
    expect(s.total).toBe(s.subtotal + s.shipping - s.discount);

    const r = await placeOrder(buyerId, addr, "key-1");
    if (!r.ok) throw new Error(r.error);
    // idempotent
    const again = await placeOrder(buyerId, addr, "key-1");
    expect(again).toMatchObject({ ok: true, orderNumber: r.orderNumber });

    expect(await stock(lamp.id)).toEqual({ on_hand: 12, reserved: 1 });
    const subs = await q<{ id: string; suborder_number: string; status: string; seller_id: string }>(
      "select so.id, so.suborder_number, so.status, so.seller_id from seller_suborders so join parent_orders po on po.id = so.parent_order_id where po.order_number = $1 order by 2", [r.orderNumber]);
    expect(subs.map((x) => x.suborder_number)).toEqual([`SUB-${r.orderNumber.slice(4)}-A`, `SUB-${r.orderNumber.slice(4)}-B`]);
    expect(subs.every((x) => x.status === "placed")).toBe(true);

    // forged webhook rejected
    const body = JSON.stringify({ id: "evt_x", type: "payment.captured", payment_id: r.paymentId });
    expect((await handleWebhook(body, "bad")).status).toBe(401);
    expect((await handleWebhook(body, sign(body))).body).toBe("processed");
    expect((await handleWebhook(body, sign(body))).body).toBe("duplicate");

    expect(await stock(lamp.id)).toEqual({ on_hand: 11, reserved: 0 });
    const ledger = await q<{ entry_type: string; amount_paise: number }>("select entry_type, amount_paise from seller_ledger_entries where suborder_id = $1 order by 1", [subs[0].id]);
    const sale = ledger.find((l) => l.entry_type === "sale")!.amount_paise;
    expect(ledger.find((l) => l.entry_type === "commission")!.amount_paise).toBe(-Math.round(sale * 0.12));

    // fulfil suborder A through delivery
    const sellerOf = (id: string) => subs.find((x) => x.id === id)!.seller_id;
    const a = subs[0];
    expect((await sellerAction(sellerOf(a.id), a.id, "accept")).ok).toBe(true);
    expect((await sellerAction(sellerOf(a.id), a.id, "ready")).ok).toBe(false); // can't skip prepare
    expect((await sellerAction(sellerOf(a.id), a.id, "prepare")).ok).toBe(true);
    expect((await sellerAction(sellerOf(a.id), a.id, "ready")).ok).toBe(true);
    const awb = (await q1<{ awb: string }>("select awb from shipments where suborder_id = $1", [a.id]))!.awb;
    for (const [i, st] of ["picked_up", "in_transit", "out_for_delivery", "delivered"].entries())
      expect(await applyCourierEvent(awb, st, "x", `e${i}`)).toBe("processed");
    expect(await applyCourierEvent(awb, "delivered", "x", "e3")).toBe("duplicate");
    expect((await q1<{ status: string }>("select status from seller_suborders where id = $1", [a.id]))!.status).toBe("delivered");
    expect((await q1<{ status: string }>("select status from parent_orders where order_number = $1", [r.orderNumber]))!.status).toBe("payment_confirmed");

    // earnings stay pending until the return window passes
    await releaseDueLedger();
    expect((await sellerBalances(a.seller_id)).available).toBe(0);
    await q("update seller_suborders set delivered_at = now() - interval '10 days' where id = $1", [a.id]);
    await releaseDueLedger();
    const bal = await sellerBalances(a.seller_id);
    expect(bal.available).toBe(sale - Math.round(sale * 0.12));
    await q("insert into seller_bank_accounts (seller_id, account_holder, account_last4, ifsc) values ($1,'X','1234','HDFC0000001') on conflict do nothing", [a.seller_id]);
    expect((await settleSeller(a.seller_id)).ok).toBe(true);
    expect((await sellerBalances(a.seller_id)).available).toBe(0);
    expect((await settleSeller(a.seller_id)).ok).toBe(false);

    // ledger rows are immutable
    await expect(q("update seller_ledger_entries set amount_paise = 1")).rejects.toThrow();
    await expect(q("delete from seller_ledger_entries")).rejects.toThrow();
  });

  it("buyer cancel refunds and restocks; failed payment releases stock; returns work", async () => {
    const mug = await variantOf("Glazed Ceramic Mug Set");
    await addToCart(mug.id, 2);
    const r = await placeOrder(buyerId, addr, "key-2");
    if (!r.ok) throw new Error(r.error);
    expect(await stock(mug.id)).toEqual({ on_hand: 30, reserved: 2 });
    await simulateGatewayEvent(r.paymentId, "payment.captured");
    expect(await stock(mug.id)).toEqual({ on_hand: 28, reserved: 0 });
    const sub = (await q1<{ id: string; seller_id: string }>("select so.id, so.seller_id from seller_suborders so join parent_orders po on po.id = so.parent_order_id where po.order_number = $1", [r.orderNumber]))!;
    expect((await buyerCancel(buyerId, sub.id)).ok).toBe(true);
    expect(await stock(mug.id)).toEqual({ on_hand: 30, reserved: 0 });
    const refund = await q1<{ amount_paise: number }>("select amount_paise from refunds where suborder_id = $1", [sub.id]);
    // 2 mugs (1.6 kg): items + ₹60 base + 3 extra 500g steps × ₹30
    expect(refund!.amount_paise).toBe(2 * 99900 + 6000 + 3 * 3000);
    const net = await q1<{ s: number }>("select sum(amount_paise)::int s from seller_ledger_entries where suborder_id = $1", [sub.id]);
    expect(net!.s).toBe(0);
    expect((await buyerCancel(buyerId, sub.id)).ok).toBe(false);

    // payment failure releases the reservation and the coupon
    await addToCart(mug.id, 2);
    await setCoupon("FLAT100");
    const f = await placeOrder(buyerId, addr, "key-3");
    if (!f.ok) throw new Error(f.error);
    await simulateGatewayEvent(f.paymentId, "payment.failed");
    expect(await stock(mug.id)).toEqual({ on_hand: 30, reserved: 0 });
    expect((await q1<{ n: number }>("select count(*)::int n from coupon_redemptions"))!.n).toBe(1); // only the first order's redemption

    // return flow on a delivered, non-custom item
    await addToCart(mug.id, 1);
    const d = await placeOrder(buyerId, addr, "key-4");
    if (!d.ok) throw new Error(d.error);
    await simulateGatewayEvent(d.paymentId, "payment.captured");
    const ds = (await q1<{ id: string; seller_id: string }>("select so.id, so.seller_id from seller_suborders so join parent_orders po on po.id = so.parent_order_id where po.order_number = $1", [d.orderNumber]))!;
    for (const a of ["accept", "prepare", "ready"] as const) await sellerAction(ds.seller_id, ds.id, a);
    const awb = (await q1<{ awb: string }>("select awb from shipments where suborder_id = $1", [ds.id]))!.awb;
    for (const [i, st] of ["picked_up", "in_transit", "delivered"].entries()) await applyCourierEvent(awb, st, "x", `d${i}`);
    expect((await requestReturn(buyerId, ds.id, "Chipped")).ok).toBe(true);
        const adminId = (await q1<{ id: string }>("select id from users where email = $1", [DEMO.admin.email]))!.id;
    expect((await decideReturn(adminId, ds.id, true)).ok).toBe(true);
    expect((await adminRefund(adminId, ds.id)).ok).toBe(true);
    expect((await q1<{ status: string }>("select status from seller_suborders where id = $1", [ds.id]))!.status).toBe("refunded");
  });

  it("rejects unserviceable PIN and prevents overselling", async () => {
    const tray = await variantOf("Madhubani Wall Painting"); // stock 5
    await addToCart(tray.id, 1);
    expect(await placeOrder(buyerId, { ...addr, pincode: "991122" }, "key-5")).toMatchObject({ ok: false });
    const res = await addToCart(tray.id, 50);
    expect(res.error).toMatch(/Only 5/);
  });
});

describe("catalog search", () => {
  it("matches multi-column text search and filters", async () => {
    const { listProducts } = await import("@/lib/server/catalog");
    const r = await listProducts({ q: "mug" });
    expect(r.rows.map((p) => p.title)).toContain("Glazed Ceramic Mug Set");
    const kashth = await listProducts({ q: "kashth", pageSize: 50 });
    expect(kashth.total).toBeGreaterThanOrEqual(3); // matches seller name
    expect(kashth.rows.every((p) => p.brand_name === "Kashth Crafts")).toBe(true);
    expect((await listProducts({ max: 99900, inStock: true })).rows.every((p) => p.price_paise <= 99900)).toBe(true);
    expect((await listProducts({ material: "92.5 Silver" })).total).toBeGreaterThanOrEqual(2);
    expect((await listProducts({ sort: "price-desc" })).rows[0].price_paise).toBe(349900);
    expect((await listProducts({ q: "100%_" })).total).toBe(0); // wildcards are escaped
  });
});

describe("dashboards", () => {
  it("run every dashboard query without SQL errors", async () => {
    const { adminStats, adminReports } = await import("@/lib/server/admin");
    const { sellerDashboard, sellerOrders } = await import("@/lib/server/seller");
    const { listSettlements, sellerLedger } = await import("@/lib/server/ledger");
    const { orderDetail, buyerOrders } = await import("@/lib/server/orders");
    const { getProduct, getCategories, listSellers, suggestions, distinctMaterials } = await import("@/lib/server/catalog");
    const s = await adminStats();
    expect(s.monthly).toHaveLength(6);
    await adminReports();
    const seller = (await q1<{ id: string }>("select id from seller_profiles where slug = 'mitti-studio'"))!;
    const d = await sellerDashboard(seller.id);
    expect(d.chart).toHaveLength(14);
    await sellerOrders(seller.id); await sellerLedger(seller.id); await listSettlements(); await listSettlements(seller.id);
    await buyerOrders(buyerId);
    const o = (await q1<{ order_number: string }>("select order_number from parent_orders limit 1"))!;
    expect((await orderDetail(o.order_number, { admin: true }))?.subs.length).toBeGreaterThan(0);
    const p = (await q1<{ id: string }>("select id from products where status='approved' limit 1"))!;
    expect((await getProduct(p.id))?.variants.length).toBeGreaterThan(0);
    await getCategories(); await listSellers(); await suggestions("mug"); await distinctMaterials();
  });
});
