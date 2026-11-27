import { q, q1 } from "./db";
import { releaseDueLedger, sellerBalances } from "./ledger";

export async function sellerDashboard(sellerId: string) {
  await releaseDueLedger();
  const [bal, counts, products, chart, lowStock, recent] = await Promise.all([
    sellerBalances(sellerId),
    q1<{ total: number; pending: number; completed: number; shipped: number; sales: number }>(
      `select count(*) filter (where status not in ('placed') )::int total,
              count(*) filter (where status in ('payment_confirmed','accepted','preparing','ready_for_pickup'))::int pending,
              count(*) filter (where status = 'delivered')::int completed,
              count(*) filter (where status in ('picked_up','in_transit','out_for_delivery'))::int shipped,
              coalesce(sum(subtotal_paise) filter (where status not in ('placed','cancelled','refunded')),0) sales
       from seller_suborders where seller_id = $1`, [sellerId]),
    q1<{ listed: number; active: number }>("select count(*)::int listed, count(*) filter (where status = 'approved')::int active from products where seller_id = $1 and status <> 'archived'", [sellerId]),
    q<{ day: string; total: number }>(
      `select to_char(d, 'DD Mon') as day, coalesce((select sum(so.subtotal_paise) from seller_suborders so where so.seller_id = $1
          and so.status not in ('placed','cancelled','refunded') and so.created_at::date = d::date), 0) total
       from generate_series(current_date - 13, current_date, interval '1 day') d order by d`, [sellerId]),
    q<{ id: string; title: string; left: number }>(
      `select p.id, p.title, (i.on_hand - i.reserved)::int "left" from products p join product_variants v on v.product_id = p.id join product_inventory i on i.variant_id = v.id
       where p.seller_id = $1 and p.status = 'approved' and v.active and i.on_hand - i.reserved <= 3 order by 3 limit 5`, [sellerId]),
    q<{ id: string; type: string; payload: Record<string, unknown>; created_at: string }>(
      "select n.id, n.type, n.payload, n.created_at from notifications n join seller_profiles s on s.user_id = n.user_id where s.id = $1 order by n.created_at desc limit 8", [sellerId]),
  ]);
  return { bal, counts: counts!, products: products!, chart, lowStock, recent };
}

export async function sellerOrders(sellerId: string, status?: string) {
  return q<{ id: string; suborder_number: string; status: string; subtotal_paise: number; created_at: string; items: string; buyer_city: string }>(
    `select so.id, so.suborder_number, so.status, so.subtotal_paise, so.created_at,
       (select string_agg(oi.quantity || ' × ' || oi.title_snapshot, ', ') from order_items oi where oi.suborder_id = so.id) items,
       po.shipping_address->>'city' buyer_city
     from seller_suborders so join parent_orders po on po.id = so.parent_order_id
     where so.seller_id = $1 and so.status <> 'placed' ${status ? "and so.status = $2" : ""} order by so.created_at desc limit 200`,
    status ? [sellerId, status] : [sellerId]);
}

export async function sellerOrder(sellerId: string, id: string) {
  const so = await q1<{ id: string; suborder_number: string; status: string; subtotal_paise: number; shipping_paise: number; created_at: string; parent_order_id: string; order_number: string; shipping_address: { name: string; phone: string; line1: string; line2?: string; city: string; state: string; pincode: string }; awb: string | null; courier: string | null; rejected_reason: string | null }>(
    `select so.id, so.suborder_number, so.status, so.subtotal_paise, so.shipping_paise, so.created_at, so.parent_order_id, so.rejected_reason, po.order_number, po.shipping_address, sh.awb, sh.courier
     from seller_suborders so join parent_orders po on po.id = so.parent_order_id left join shipments sh on sh.suborder_id = so.id
     where so.id = $1 and so.seller_id = $2 and so.status <> 'placed'`, [id, sellerId]);
  if (!so) return undefined;
  const items = await q<{ id: string; title_snapshot: string; unit_price_paise: number; quantity: number }>("select id, title_snapshot, unit_price_paise, quantity from order_items where suborder_id = $1", [id]);
  const commission = await q1<{ rate_bps: number; amount_paise: number }>("select rate_bps, amount_paise from commissions where suborder_id = $1", [id]);
  return { ...so, items, commission };
}
