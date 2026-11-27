import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { Badge, FilterBar, label, NumberPager, PageTitle, qs, Stat, statusColor, Table, Td } from "@/components/ui";

export const metadata = { title: "Orders" };
const PAGE = 15;
const STATUSES = ["payment_confirmed", "accepted", "preparing", "ready_for_pickup", "picked_up", "in_transit", "out_for_delivery", "delivered", "delivery_failed", "cancelled", "return_requested", "return_in_progress", "refunded"];
type Sp = { q?: string; status?: string; seller?: string; page?: string };

export default async function AdminOrders({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  await requireAdmin("orders");
  const page = Math.max(1, Number(sp.page) || 1);
  const p: unknown[] = []; let w = "po.status <> 'placed'";
  if (sp.q?.trim()) { p.push(`%${sp.q.trim()}%`); w += ` and (po.order_number ilike $${p.length} or u.email ilike $${p.length} or u.full_name ilike $${p.length} or so.suborder_number ilike $${p.length})`; }
  if (STATUSES.includes(sp.status ?? "")) { p.push(sp.status); w += ` and so.status = $${p.length}`; }
  if (sp.seller) { p.push(sp.seller); w += ` and so.seller_id::text = $${p.length}`; }
  const from = `from seller_suborders so join parent_orders po on po.id = so.parent_order_id join users u on u.id = po.buyer_id join seller_profiles s on s.id = so.seller_id where ${w}`;
  const [rows, total, stats, sellers] = await Promise.all([
    q<{ order_number: string; suborder_number: string; status: string; brand_name: string; buyer: string; subtotal_paise: number; created_at: string }>(
      `select po.order_number, so.suborder_number, so.status, s.brand_name, coalesce(u.full_name, u.email) buyer, so.subtotal_paise, po.created_at ${from}
       order by po.created_at desc, so.suborder_number limit ${PAGE} offset ${(page - 1) * PAGE}`, p),
    q1<{ n: number }>(`select count(*)::int n ${from}`, p),
    q1<{ total: number; dispatch: number; delivered: number; issues: number }>(
      `select count(*)::int total, count(*) filter (where status in ('payment_confirmed','accepted','preparing','ready_for_pickup'))::int dispatch,
              count(*) filter (where status = 'delivered')::int delivered,
              count(*) filter (where status in ('delivery_failed','return_requested','return_in_progress'))::int issues
       from seller_suborders where status <> 'placed'`),
    q<{ id: string; brand_name: string }>("select id, brand_name from seller_profiles order by brand_name"),
  ]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PAGE));
  const href = (n: number) => qs("/admin/orders", { q: sp.q, status: sp.status, seller: sp.seller, page: String(n) });
  return (
    <>
      <PageTitle title="Orders" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total suborders" value={stats?.total ?? 0} tone={0} icon="cart" /><Stat label="Awaiting dispatch" value={stats?.dispatch ?? 0} tone={1} icon="truck" />
        <Stat label="Delivered" value={stats?.delivered ?? 0} tone={2} icon="check" /><Stat label="Needs attention" value={stats?.issues ?? 0} tone={3} icon="alert" />
      </div>
      <FilterBar action="/admin/orders" q={sp.q} selects={[
        { name: "status", label: "Status", value: sp.status, options: STATUSES.map((s) => [s, label(s)]) },
        { name: "seller", label: "Seller", value: sp.seller, options: sellers.map((s) => [s.id, s.brand_name]) },
      ]} />
      <Table head={["Order", "Suborder", "Buyer", "Seller", "Amount", "Status", "Date"]} empty={rows.length ? undefined : "No orders match."}>
        {rows.map((r) => <tr key={r.suborder_number}><Td><Link href={`/admin/orders/${r.order_number}`} className="font-medium text-forest underline">{r.order_number}</Link></Td><Td>{r.suborder_number}</Td><Td>{r.buyer}</Td><Td>{r.brand_name}</Td><Td>{formatINR(r.subtotal_paise)}</Td><Td><Badge color={statusColor(r.status)}>{label(r.status)}</Badge></Td><Td>{new Date(r.created_at).toLocaleDateString("en-IN")}</Td></tr>)}</Table>
      <NumberPager page={page} pages={pages} href={href} />
    </>
  );
}
