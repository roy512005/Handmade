import { q, q1, tx, type Queryable } from "./db";
import { getCartSummary } from "./cart";
import { evaluateCoupon } from "./coupons";
import { getSettings, isServiceable, createShipment } from "./shipping";
import { newProviderPaymentId } from "./payments";
import { writeLedger } from "./ledger";
import { notify, notifyAdmins, notifySeller } from "./notify";
import { canTransition, fromCourier, parentStatus, type SubStatus } from "@/lib/orderState";
import { commissionPaise } from "@/lib/money";

export type Address = { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string };

export async function placeOrder(userId: string, address: Address, idempotencyKey: string): Promise<{ ok: true; orderNumber: string; paymentId: string } | { ok: false; error: string }> {
  const dup = await q1<{ id: string; order_number: string }>("select id, order_number from parent_orders where idempotency_key = $1 and buyer_id = $2", [idempotencyKey, userId]);
  if (dup) {
    const p = await q1<{ provider_payment_id: string }>("select provider_payment_id from payments where parent_order_id = $1 order by created_at desc limit 1", [dup.id]);
    return { ok: true, orderNumber: dup.order_number, paymentId: p!.provider_payment_id };
  }
  if (!isServiceable(address.pincode)) return { ok: false, error: "Sorry, we can't deliver to this PIN code yet." };

  const summary = await getCartSummary();
  if (!summary.groups.length) return { ok: false, error: "Your cart is empty." };
  if (summary.problems.length) return { ok: false, error: summary.problems[0] };

  return tx(async (db) => {
    const lines = summary.groups.flatMap((g) => g.lines);
    // coupon re-evaluated inside the transaction
    let discount = 0; let couponId: string | null = null;
    const perGroupDiscount = new Map<string, number>();
    if (summary.couponCode) {
      const r = await evaluateCoupon(summary.couponCode, userId, lines.map((l) => ({ categoryId: l.categoryId, sellerId: l.sellerId, subtotal: l.unitPrice * l.quantity })), db);
      if (!r.ok) return { ok: false as const, error: r.error };
      discount = r.discount; couponId = r.couponId;
    }
    const sub = summary.subtotal;
    let left = discount;
    summary.groups.forEach((g, i) => {
      const d = i === summary.groups.length - 1 ? left : Math.floor((discount * g.subtotal) / sub);
      perGroupDiscount.set(g.sellerId, d); left -= d;
    });

    // reserve stock atomically
    for (const l of lines) {
      const r = await q<{ variant_id: string }>(
        "update product_inventory set reserved = reserved + $2 where variant_id = $1 and on_hand - reserved >= $2 returning variant_id",
        [l.variantId, l.quantity], db);
      if (!r.length) throw new StockError(`"${l.title}" just went out of stock.`);
    }

    const total = sub + summary.shipping - discount;
    const parent = (await q1<{ id: string; order_number: string }>(
      `insert into parent_orders (buyer_id, idempotency_key, shipping_address, subtotal_paise, shipping_paise, discount_paise, total_paise, coupon_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8) returning id, order_number`,
      [userId, idempotencyKey, JSON.stringify(address), sub, summary.shipping, discount, total, couponId], db))!;
    const num = parent.order_number.replace("ORD-", "");

    for (let i = 0; i < summary.groups.length; i++) {
      const g = summary.groups[i];
      const so = (await q1<{ id: string }>(
        `insert into seller_suborders (parent_order_id, seller_id, suborder_number, subtotal_paise, shipping_paise, discount_paise)
         values ($1,$2,$3,$4,$5,$6) returning id`,
        [parent.id, g.sellerId, `SUB-${num}-${String.fromCharCode(65 + i)}`, g.subtotal, g.shipping, perGroupDiscount.get(g.sellerId) ?? 0], db))!;
      for (const l of g.lines) {
        await q(
          "insert into order_items (suborder_id, product_id, variant_id, title_snapshot, unit_price_paise, quantity) values ($1,$2,$3,$4,$5,$6)",
          [so.id, l.productId, l.variantId, l.title, l.unitPrice, l.quantity], db);
      }
    }
    if (couponId) {
      await q("insert into coupon_redemptions (coupon_id, user_id, parent_order_id, discount_paise) values ($1,$2,$3,$4)", [couponId, userId, parent.id, discount], db);
    }
    const providerPaymentId = newProviderPaymentId();
    await q("insert into payments (parent_order_id, provider, provider_payment_id, amount_paise) values ($1,'mockpay',$2,$3)", [parent.id, providerPaymentId, total], db);
    return { ok: true as const, orderNumber: parent.order_number, paymentId: providerPaymentId };
  }).catch((e) => {
    if (e instanceof StockError) return { ok: false as const, error: e.message };
    throw e;
  });
}
class StockError extends Error {}

// ───────── payment outcomes (called from the verified webhook handler, inside its transaction) ─────────

export async function onPaymentCaptured(paymentId: string, db: Queryable) {
  const pay = (await q1<{ parent_order_id: string; status: string }>("select parent_order_id, status from payments where id = $1 for update", [paymentId], db))!;
  if (pay.status === "captured") return;
  const settings = await getSettings(db);
  await q("update payments set status = 'captured' where id = $1", [paymentId], db);
  await q("update parent_orders set status = 'payment_confirmed' where id = $1", [pay.parent_order_id], db);
  const subs = await q<{ id: string; seller_id: string; subtotal_paise: number; suborder_number: string; commission_bps: number | null }>(
    `select so.id, so.seller_id, so.subtotal_paise, so.suborder_number, sp.commission_bps
     from seller_suborders so join seller_profiles sp on sp.id = so.seller_id where so.parent_order_id = $1`, [pay.parent_order_id], db);
  const parent = (await q1<{ buyer_id: string; order_number: string }>("select buyer_id, order_number from parent_orders where id = $1", [pay.parent_order_id], db))!;
  for (const s of subs) {
    await q("update seller_suborders set status = 'payment_confirmed' where id = $1 and status = 'placed'", [s.id], db);
    // convert reservation into a real stock decrement
    await q(
      `update product_inventory i set on_hand = on_hand - oi.quantity, reserved = reserved - oi.quantity
       from order_items oi where oi.suborder_id = $1 and i.variant_id = oi.variant_id`, [s.id], db);
    const bps = s.commission_bps ?? settings.commissionBps;
    const fee = commissionPaise(s.subtotal_paise, bps);
    await q("insert into commissions (suborder_id, rate_bps, base_paise, amount_paise) values ($1,$2,$3,$4)", [s.id, bps, s.subtotal_paise, fee], db);
    await writeLedger(db, { sellerId: s.seller_id, suborderId: s.id, type: "sale", amount: s.subtotal_paise, ref: s.suborder_number });
    await writeLedger(db, { sellerId: s.seller_id, suborderId: s.id, type: "commission", amount: -fee, ref: `${bps}bps` });
    await notifySeller(s.seller_id, "new_order", { suborder: s.suborder_number }, db);
  }
  // clear purchased lines from the buyer's cart now that payment is confirmed
  await q(
    `delete from cart_items where cart_id = (select id from carts where user_id = $1) and not saved_for_later
       and variant_id in (select oi.variant_id from order_items oi join seller_suborders so on so.id = oi.suborder_id where so.parent_order_id = $2)`,
    [parent.buyer_id, pay.parent_order_id], db);
  await q("update carts set coupon_code = null where user_id = $1", [parent.buyer_id], db);
  await notify(parent.buyer_id, "payment_confirmed", { order: parent.order_number }, `pay-${paymentId}`, db);
}

export async function onPaymentFailed(paymentId: string, db: Queryable) {
  const pay = (await q1<{ parent_order_id: string; status: string }>("select parent_order_id, status from payments where id = $1 for update", [paymentId], db))!;
  if (pay.status !== "created") return;
  await q("update payments set status = 'failed' where id = $1", [paymentId], db);
  await q(
    `update product_inventory i set reserved = reserved - oi.quantity
     from order_items oi join seller_suborders so on so.id = oi.suborder_id
     where so.parent_order_id = $1 and i.variant_id = oi.variant_id`, [pay.parent_order_id], db);
  await q("update seller_suborders set status = 'cancelled', cancelled_by = 'payment_failed' where parent_order_id = $1", [pay.parent_order_id], db);
  await q("update parent_orders set status = 'cancelled' where id = $1", [pay.parent_order_id], db);
  await q("delete from coupon_redemptions where parent_order_id = $1", [pay.parent_order_id], db);
  await notifyAdmins("payment_failed", { payment: paymentId }, db);
}

// ───────── lifecycle ─────────

async function recomputeParent(parentId: string, db: Queryable) {
  const rows = await q<{ status: SubStatus }>("select status from seller_suborders where parent_order_id = $1", [parentId], db);
  const ps = parentStatus(rows.map((r) => r.status));
  if (ps !== "placed") await q("update parent_orders set status = $2 where id = $1", [parentId, ps], db);
}

type Sub = { id: string; seller_id: string; parent_order_id: string; status: SubStatus; suborder_number: string; buyer_id: string; subtotal_paise: number; shipping_paise: number; discount_paise: number };
const getSub = (id: string, db: Queryable) => q1<Sub>(
  `select so.id, so.seller_id, so.parent_order_id, so.status, so.suborder_number, po.buyer_id, so.subtotal_paise, so.shipping_paise, so.discount_paise
   from seller_suborders so join parent_orders po on po.id = so.parent_order_id where so.id = $1 for update of so`, [id], db);

export async function setStatus(sub: Sub, to: SubStatus, db: Queryable) {
  if (!canTransition(sub.status, to)) throw new Error(`Cannot move order from ${sub.status} to ${to}`);
  await q("update seller_suborders set status = $2 where id = $1", [sub.id, to], db);
  await recomputeParent(sub.parent_order_id, db);
}

export type SellerAction = "accept" | "reject" | "prepare" | "ready";

export async function sellerAction(sellerId: string, suborderId: string, action: SellerAction, reason?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await tx(async (db) => {
      const sub = await getSub(suborderId, db);
      if (!sub || sub.seller_id !== sellerId) throw new Error("Order not found.");
      if (action === "reject") { await cancelInTx(sub, "seller", db, reason); return; }
      const to: SubStatus = { accept: "accepted", prepare: "preparing", ready: "ready_for_pickup" }[action] as SubStatus;
      await setStatus(sub, to, db);
      if (action === "ready") {
        const addr = (await q1<{ shipping_address: Address }>("select shipping_address from parent_orders where id = $1", [sub.parent_order_id], db))!.shipping_address;
        if (!isServiceable(addr.pincode)) throw new Error("Courier can't deliver to this PIN code. Contact support to cancel and refund.");
        await createShipment(sub.id, db);
      }
      await notify(sub.buyer_id, `order_${to}`, { suborder: sub.suborder_number }, `${sub.id}-${to}`, db);
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function buyerCancel(buyerId: string, suborderId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await tx(async (db) => {
      const sub = await getSub(suborderId, db);
      if (!sub || sub.buyer_id !== buyerId) throw new Error("Order not found.");
      await cancelInTx(sub, "buyer", db);
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

async function cancelInTx(sub: Sub, by: string, db: Queryable, reason?: string) {
  if (by === "buyer" && !["payment_confirmed", "accepted", "preparing", "ready_for_pickup"].includes(sub.status))
    throw new Error("This order can no longer be cancelled.");
  await setStatus(sub, "cancelled", db);
  await q("update seller_suborders set cancelled_by = $2, rejected_reason = $3 where id = $1", [sub.id, by, reason ?? null], db);
  // return stock to shelf (stock was decremented at capture)
  await q(`update product_inventory i set on_hand = on_hand + oi.quantity from order_items oi where oi.suborder_id = $1 and i.variant_id = oi.variant_id`, [sub.id], db);
  await refundInTx({ ...sub, status: "cancelled" }, null, db);
  await notify(sub.buyer_id, "order_cancelled", { suborder: sub.suborder_number, by }, `${sub.id}-cancel`, db);
  if (by !== "seller") await notifySeller(sub.seller_id, "order_cancelled", { suborder: sub.suborder_number, by }, db);
}

async function refundInTx(sub: Sub, actorId: string | null, db: Queryable) {
  const amount = sub.subtotal_paise + sub.shipping_paise - sub.discount_paise;
  const pay = (await q1<{ id: string }>("select id from payments where parent_order_id = $1 and status in ('captured','partially_refunded') limit 1", [sub.parent_order_id], db));
  if (!pay) { // payment never captured, nothing to refund
    return;
  }
  if (amount > 0) {
    await q("insert into refunds (payment_id, suborder_id, amount_paise, status, provider_ref, approved_by) values ($1,$2,$3,'processed',$4,$5)",
      [pay.id, sub.id, amount, "mockrefund_" + Date.now(), actorId], db);
  }
  await q(
    `update payments set status = case when (select coalesce(sum(amount_paise),0) from refunds where payment_id = $1 and status = 'processed') >= amount_paise
       then 'refunded' else 'partially_refunded' end where id = $1`, [pay.id], db);
  // ledger reversal mirrors the original sale/commission status
  const sale = await q1<{ status: string }>("select status from seller_ledger_entries where suborder_id = $1 and entry_type = 'sale' limit 1", [sub.id], db);
  const fee = (await q1<{ amount_paise: number }>("select amount_paise from commissions where suborder_id = $1", [sub.id], db))?.amount_paise ?? 0;
  if (sale) {
    const st = sale.status === "pending" ? "pending" : "available";
    await writeLedger(db, { sellerId: sub.seller_id, suborderId: sub.id, type: "refund_reversal", amount: -sub.subtotal_paise, status: st });
    if (fee) await writeLedger(db, { sellerId: sub.seller_id, suborderId: sub.id, type: "commission_reversal", amount: fee, status: st });
  }
  await q("update seller_suborders set status = 'refunded' where id = $1 and status in ('cancelled','return_in_progress','delivery_failed')", [sub.id], db);
  await recomputeParent(sub.parent_order_id, db);
  await notify(sub.buyer_id, "refund_processed", { suborder: sub.suborder_number, amount_paise: amount }, `${sub.id}-refund`, db);
}

/** Admin refund of any suborder in a refundable state (return_in_progress, delivery_failed, cancelled). */
export async function adminRefund(actorId: string, suborderId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await tx(async (db) => {
      const sub = await getSub(suborderId, db);
      if (!sub) throw new Error("Order not found.");
      if (!["return_in_progress", "delivery_failed"].includes(sub.status)) throw new Error("This order isn't awaiting a refund.");
      if (sub.status === "return_in_progress") {
        // goods come back to the seller; treat stock as returned
        await q("update product_inventory i set on_hand = on_hand + oi.quantity from order_items oi where oi.suborder_id = $1 and i.variant_id = oi.variant_id", [sub.id], db);
      }
      await refundInTx(sub, actorId, db);
      await q("insert into audit_logs (actor_id, action, target_type, target_id) values ($1,'refund','suborder',$2)", [actorId, sub.id], db);
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

/** Admin cancels an order that hasn't shipped (e.g. courier can't service the PIN). */
export async function adminCancel(actorId: string, suborderId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await tx(async (db) => {
      const sub = await getSub(suborderId, db);
      if (!sub) throw new Error("Order not found.");
      await setStatus(sub, "cancelled", db);
      await q("update seller_suborders set cancelled_by = 'admin' where id = $1", [sub.id], db);
      await q("update product_inventory i set on_hand = on_hand + oi.quantity from order_items oi where oi.suborder_id = $1 and i.variant_id = oi.variant_id", [sub.id], db);
      await refundInTx({ ...sub, status: "cancelled" }, actorId, db);
      await q("insert into audit_logs (actor_id, action, target_type, target_id) values ($1,'cancel_order','suborder',$2)", [actorId, sub.id], db);
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function requestReturn(buyerId: string, suborderId: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { returnWindowDays } = await getSettings();
    await tx(async (db) => {
      const sub = await getSub(suborderId, db);
      if (!sub || sub.buyer_id !== buyerId) throw new Error("Order not found.");
      const d = await q1<{ delivered_at: string | null }>("select delivered_at from seller_suborders where id = $1", [sub.id], db);
      if (!d?.delivered_at || Date.now() - new Date(d.delivered_at).getTime() > returnWindowDays * 86400_000) throw new Error("The return window for this order has closed.");
      const custom = await q1("select 1 from order_items oi join products p on p.id = oi.product_id where oi.suborder_id = $1 and p.is_custom", [sub.id], db);
      if (custom) throw new Error("Made-to-order items can't be returned. Contact support if there's a problem.");
      await setStatus(sub, "return_requested", db);
      await q("insert into return_requests (suborder_id, requested_by, reason) values ($1,$2,$3)", [sub.id, buyerId, reason], db);
      await notifyAdmins("return_requested", { suborder: sub.suborder_number }, db);
      await notifySeller(sub.seller_id, "return_requested", { suborder: sub.suborder_number }, db);
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function decideReturn(actorId: string, suborderId: string, approve: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await tx(async (db) => {
      const sub = await getSub(suborderId, db);
      if (!sub) throw new Error("Order not found.");
      if (approve) await setStatus(sub, "return_in_progress", db);
      else await setStatus(sub, "delivered", db);
      await q("update return_requests set status = $2 where suborder_id = $1 and status = 'requested'", [sub.id, approve ? "approved" : "rejected"], db);
      await q("insert into audit_logs (actor_id, action, target_type, target_id) values ($1,$2,'suborder',$3)", [actorId, approve ? "return_approved" : "return_rejected", sub.id], db);
      await notify(sub.buyer_id, approve ? "return_approved" : "return_rejected", { suborder: sub.suborder_number }, `${sub.id}-ret-${approve}`, db);
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// ───────── courier events (webhook from courier / admin simulation) ─────────

export async function applyCourierEvent(awb: string, courierStatus: string, location: string, eventId: string): Promise<"processed" | "duplicate" | "ignored" | "unknown_shipment"> {
  const to = fromCourier(courierStatus);
  return tx(async (db) => {
    const sh = await q1<{ id: string; suborder_id: string }>("select id, suborder_id from shipments where awb = $1", [awb], db);
    if (!sh) return "unknown_shipment";
    const ins = await q1<{ id: string }>(
      `insert into shipment_events (shipment_id, provider_event_id, status, location, occurred_at) values ($1,$2,$3,$4, now())
       on conflict (shipment_id, provider_event_id) do nothing returning id`, [sh.id, eventId, courierStatus, location], db);
    if (!ins) return "duplicate";
    await q("update shipments set status = $2 where id = $1", [sh.id, courierStatus], db);
    if (!to) return "ignored";
    const sub = (await getSub(sh.suborder_id, db))!;
    if (sub.status === to) return "ignored";
    if (!canTransition(sub.status, to)) return "ignored"; // out-of-order/late event
    await setStatus(sub, to, db);
    if (to === "delivered") await q("update seller_suborders set delivered_at = now() where id = $1", [sub.id], db);
    await notify(sub.buyer_id, `shipment_${to}`, { suborder: sub.suborder_number }, `${sub.id}-${to}`, db);
    if (to === "delivery_failed") await notifyAdmins("delivery_failed", { suborder: sub.suborder_number }, db);
    return "processed";
  });
}

/** Next courier status for the admin "simulate courier" button. */
export const NEXT_COURIER: Partial<Record<SubStatus, string>> = {
  ready_for_pickup: "picked_up", picked_up: "in_transit", in_transit: "out_for_delivery", out_for_delivery: "delivered",
};

// ───────── reviews ─────────
export async function addReview(userId: string, orderItemId: string, rating: number, body: string): Promise<{ ok: boolean; error?: string }> {
  const item = await q1<{ product_id: string }>(
    `select oi.product_id from order_items oi join seller_suborders so on so.id = oi.suborder_id
     join parent_orders po on po.id = so.parent_order_id
     where oi.id = $1 and po.buyer_id = $2 and so.status in ('delivered','return_requested')`, [orderItemId, userId]);
  if (!item) return { ok: false, error: "You can review items after they're delivered." };
  const r = await q("insert into reviews (product_id, user_id, order_item_id, rating, body) values ($1,$2,$3,$4,$5) on conflict (order_item_id) do nothing returning id",
    [item.product_id, userId, orderItemId, rating, body || null]);
  return r.length ? { ok: true } : { ok: false, error: "You've already reviewed this item." };
}

// ───────── queries ─────────
export async function buyerOrders(userId: string) {
  return q<{ id: string; order_number: string; status: string; total_paise: number; created_at: string; item_count: number }>(
    `select po.id, po.order_number, po.status, po.total_paise, po.created_at,
       (select coalesce(sum(oi.quantity),0)::int from order_items oi join seller_suborders so on so.id = oi.suborder_id where so.parent_order_id = po.id) item_count
     from parent_orders po where po.buyer_id = $1 order by po.created_at desc`, [userId]);
}

export async function orderDetail(orderNumber: string, viewer: { userId?: string; admin?: boolean }) {
  const { returnWindowDays } = await getSettings();
  const po = await q1<{ id: string; order_number: string; buyer_id: string; status: string; shipping_address: Address; subtotal_paise: number; shipping_paise: number; discount_paise: number; total_paise: number; created_at: string; buyer_name: string | null; buyer_email: string }>(
    `select po.*, u.full_name buyer_name, u.email buyer_email from parent_orders po join users u on u.id = po.buyer_id where po.order_number = $1`, [orderNumber]);
  if (!po) return undefined;
  if (!viewer.admin && po.buyer_id !== viewer.userId) return undefined;
  const subs = await q<{ id: string; suborder_number: string; status: SubStatus; brand_name: string; subtotal_paise: number; shipping_paise: number; discount_paise: number; delivered_at: string | null; returnable: boolean; awb: string | null; courier: string | null; rejected_reason: string | null }>(
    `select so.id, (so.delivered_at is not null and so.delivered_at + ($2 || ' days')::interval > now()) returnable, so.suborder_number, so.status, s.brand_name, so.subtotal_paise, so.shipping_paise, so.discount_paise, so.delivered_at, so.rejected_reason, sh.awb, sh.courier
     from seller_suborders so join seller_profiles s on s.id = so.seller_id left join shipments sh on sh.suborder_id = so.id
     where so.parent_order_id = $1 order by so.suborder_number`, [po.id, String(returnWindowDays)]);
  const out = [];
  for (const s of subs) {
    const items = await q<{ id: string; product_id: string; title_snapshot: string; unit_price_paise: number; quantity: number; reviewed: boolean }>(
      `select oi.id, oi.product_id, oi.title_snapshot, oi.unit_price_paise, oi.quantity,
        exists (select 1 from reviews r where r.order_item_id = oi.id) reviewed from order_items oi where oi.suborder_id = $1`, [s.id]);
    const events = await q<{ status: string; location: string | null; occurred_at: string }>(
      "select e.status, e.location, e.occurred_at from shipment_events e join shipments sh on sh.id = e.shipment_id where sh.suborder_id = $1 order by e.occurred_at", [s.id]);
    out.push({ ...s, items, events });
  }
  const pay = await q1<{ status: string; provider_payment_id: string }>("select status, provider_payment_id from payments where parent_order_id = $1 order by created_at desc limit 1", [po.id]);
  return { ...po, subs: out, payment: pay };
}
