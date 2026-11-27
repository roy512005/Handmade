import Link from "next/link";
import { requireSeller } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { STATUS_LABEL, type SubStatus } from "@/lib/orderState";
import { Badge, btn2, btnSm, FilterBar, NumberPager, PageTitle, qs, Stat, statusColor, Table, Td } from "@/components/ui";

export const metadata = { title: "Orders" };
const PAGE = 10;
const STATUSES: SubStatus[] = ["payment_confirmed", "accepted", "preparing", "ready_for_pickup", "picked_up", "in_transit", "out_for_delivery", "delivered", "cancelled", "return_requested", "refunded"];
type Sp = { q?: string; status?: string; page?: string };

export default async function SellerOrders({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const u = await requireSeller();
  const page = Math.max(1, Number(sp.page) || 1);
  const p: unknown[] = [u.sellerId]; let w = "so.seller_id = $1 and so.status <> 'placed'";
  if (sp.q?.trim()) { p.push(`%${sp.q.trim()}%`); w += ` and (so.suborder_number ilike $${p.length} or exists (select 1 from order_items oi where oi.suborder_id = so.id and oi.title_snapshot ilike $${p.length}))`; }
  if (STATUSES.includes(sp.status as SubStatus)) { p.push(sp.status); w += ` and so.status = $${p.length}`; }
  const from = `from seller_suborders so join parent_orders po on po.id = so.parent_order_id where ${w}`;
  const [rows, total, stats] = await Promise.all([
    q<{ id: string; suborder_number: string; status: string; subtotal_paise: number; created_at: string; items: string; buyer_city: string }>(
      `select so.id, so.suborder_number, so.status, so.subtotal_paise, so.created_at,
         (select string_agg(oi.quantity || ' × ' || oi.title_snapshot, ', ') from order_items oi where oi.suborder_id = so.id) items, po.shipping_address->>'city' buyer_city ${from}
       order by so.created_at desc limit ${PAGE} offset ${(page - 1) * PAGE}`, p),
    q1<{ n: number }>(`select count(*)::int n ${from}`, p),
    q1<{ total: number; fresh: number; progress: number; delivered: number }>(
      `select count(*)::int total, count(*) filter (where status = 'payment_confirmed')::int fresh,
              count(*) filter (where status in ('accepted','preparing','ready_for_pickup','picked_up','in_transit','out_for_delivery'))::int progress,
              count(*) filter (where status = 'delivered')::int delivered
       from seller_suborders where seller_id = $1 and status <> 'placed'`, [u.sellerId]),
  ]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PAGE));
  const href = (n: number) => qs("/seller/orders", { q: sp.q, status: sp.status, page: String(n) });
  return (
    <>
      <PageTitle title="Orders" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total orders" value={stats?.total ?? 0} tone={0} icon="cart" /><Stat label="New — accept now" value={stats?.fresh ?? 0} tone={1} icon="alert" />
        <Stat label="In progress" value={stats?.progress ?? 0} tone={2} icon="truck" /><Stat label="Delivered" value={stats?.delivered ?? 0} tone={3} icon="check" />
      </div>
      <FilterBar action="/seller/orders" q={sp.q} selects={[{ name: "status", label: "Status", value: sp.status, options: STATUSES.map((s) => [s, STATUS_LABEL[s]]) }]} />
      <Table head={["Order", "Items", "Ship to", "Amount", "Date", "Status", "Action"]} empty={rows.length ? undefined : "No orders here yet."}>
        {rows.map((r) => <tr key={r.id}><Td><Link href={`/seller/orders/${r.id}`} className="font-medium text-forest underline">{r.suborder_number}</Link></Td><Td className="max-w-xs">{r.items}</Td><Td>{r.buyer_city}</Td><Td>{formatINR(r.subtotal_paise)}</Td>
          <Td>{new Date(r.created_at).toLocaleDateString("en-IN")}</Td><Td><Badge color={statusColor(r.status)}>{STATUS_LABEL[r.status as SubStatus]}</Badge></Td>
          <Td><Link href={`/seller/orders/${r.id}`} className={`${btn2} ${btnSm}`}>{r.status === "payment_confirmed" ? "Accept" : "View"}</Link></Td></tr>)}</Table>
      <NumberPager page={page} pages={pages} href={href} />
    </>
  );
}
