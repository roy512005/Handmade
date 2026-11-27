import { q, q1 } from "./db";

const LIVE = "so.status not in ('placed','cancelled','refunded')";

export async function adminStats() {
  const [money, counts, monthly, cats, txns] = await Promise.all([
    q1<{ gmv: number; commission: number; refunds: number }>(
      `select coalesce((select sum(so.subtotal_paise) from seller_suborders so where ${LIVE}),0) gmv,
              coalesce((select sum(c.amount_paise) from commissions c join seller_suborders so on so.id = c.suborder_id where ${LIVE}),0) commission,
              coalesce((select sum(amount_paise) from refunds where status = 'processed'),0) refunds`),
    q1<{ orders: number; customers: number; sellers: number; pendingSellers: number; pendingProducts: number; awaitingDispatch: number; refundRequests: number }>(
      `select (select count(*)::int from parent_orders where status <> 'placed') orders,
              (select count(*)::int from user_roles where role = 'buyer') customers,
              (select count(*)::int from seller_profiles where status = 'approved') sellers,
              (select count(*)::int from seller_profiles where status in ('pending','under_review')) "pendingSellers",
              (select count(*)::int from products where status = 'pending_approval') "pendingProducts",
              (select count(*)::int from seller_suborders where status in ('payment_confirmed','accepted','preparing','ready_for_pickup')) "awaitingDispatch",
              (select count(*)::int from seller_suborders where status in ('return_requested','return_in_progress','delivery_failed')) "refundRequests"`),
    q<{ month: string; total: number }>(
      `select to_char(m, 'Mon') as month, coalesce((select sum(so.subtotal_paise) from seller_suborders so where ${LIVE} and date_trunc('month', so.created_at) = m),0) total
       from generate_series(date_trunc('month', now()) - interval '5 months', date_trunc('month', now()), interval '1 month') m order by m`),
    q<{ name: string; total: number }>(
      `select c.name, sum(oi.unit_price_paise * oi.quantity) total from order_items oi join seller_suborders so on so.id = oi.suborder_id
       join products p on p.id = oi.product_id join categories c on c.id = p.category_id where ${LIVE} group by c.name order by 2 desc limit 5`),
    q<{ id: string; order_number: string; amount_paise: number; status: string; created_at: string }>(
      `select p.id, po.order_number, p.amount_paise, p.status, p.created_at from payments p join parent_orders po on po.id = p.parent_order_id order by p.created_at desc limit 8`),
  ]);
  return { money: money!, counts: counts!, monthly, cats, txns };
}

export async function adminReports() {
  const [daily, kpi, byCat, bySeller] = await Promise.all([
    q<{ day: string; orders: number; gmv: number }>(
      `select to_char(created_at::date, 'DD Mon YYYY') as day, count(*)::int orders, sum(subtotal_paise) gmv from seller_suborders so
       where ${LIVE} and created_at > now() - interval '30 days' group by created_at::date order by created_at::date desc`),
    q1<{ orders: number; aov: number; cancelled: number; returned: number; total: number; refunded: number; repeat: number; buyers: number }>(
      `select (select count(*)::int from parent_orders where status <> 'placed') orders,
              coalesce((select avg(total_paise) from parent_orders where status <> 'placed'),0) aov,
              (select count(*)::int from seller_suborders where status in ('cancelled') and cancelled_by <> 'payment_failed') cancelled,
              (select count(*)::int from return_requests) returned,
              (select count(*)::int from seller_suborders where status <> 'placed' and (cancelled_by is distinct from 'payment_failed')) total,
              coalesce((select sum(amount_paise) from refunds where status = 'processed'),0) refunded,
              (select count(*)::int from (select buyer_id from parent_orders where status <> 'placed' group by buyer_id having count(*) > 1) r) repeat,
              (select count(distinct buyer_id)::int from parent_orders where status <> 'placed') buyers`),
    q<{ name: string; n: number; total: number }>(
      `select c.name, count(distinct so.id)::int n, sum(oi.unit_price_paise * oi.quantity) total from order_items oi join seller_suborders so on so.id = oi.suborder_id
       join products p on p.id = oi.product_id join categories c on c.id = p.category_id where ${LIVE} group by c.name order by 3 desc`),
    q<{ brand_name: string; orders: number; gmv: number; delivered: number; cancelled: number }>(
      `select s.brand_name, count(*) filter (where so.status <> 'placed')::int orders, coalesce(sum(so.subtotal_paise) filter (where ${LIVE}),0) gmv,
              count(*) filter (where so.status = 'delivered')::int delivered, count(*) filter (where so.cancelled_by = 'seller')::int cancelled
       from seller_profiles s left join seller_suborders so on so.seller_id = s.id where s.status = 'approved' group by s.brand_name order by gmv desc`),
  ]);
  return { daily, kpi: kpi!, byCat, bySeller };
}
