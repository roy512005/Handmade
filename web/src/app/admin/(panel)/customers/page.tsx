import { requireAdmin } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { customerStatusAction } from "@/app/actions/admin";
import { Badge, btn2, btnDanger, btnSm, FilterBar, Flash, label, NumberPager, PageTitle, qs, Stat, statusColor, Table, Td } from "@/components/ui";

export const metadata = { title: "Customers" };
const PAGE = 15;
type Sp = { q?: string; status?: string; page?: string; msg?: string; err?: string };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  await requireAdmin("customers");
  const page = Math.max(1, Number(sp.page) || 1);
  const p: unknown[] = []; let w = "true";
  if (sp.q?.trim()) { p.push(`%${sp.q.trim()}%`); w += ` and (u.email ilike $${p.length} or u.full_name ilike $${p.length})`; }
  if (sp.status === "active" || sp.status === "suspended") { p.push(sp.status); w += ` and u.status = $${p.length}`; }
  const from = `from users u join user_roles r on r.user_id = u.id and r.role = 'buyer' where ${w}`;
  const [rows, total, stats] = await Promise.all([
    q<{ id: string; email: string; full_name: string | null; status: string; created_at: string; orders: number; spent: number }>(
      `select u.id, u.email, u.full_name, u.status, u.created_at,
         (select count(*)::int from parent_orders po where po.buyer_id = u.id and po.status <> 'placed') orders,
         coalesce((select sum(total_paise) from parent_orders po where po.buyer_id = u.id and po.status not in ('placed','cancelled')),0) spent ${from}
       order by u.created_at desc limit ${PAGE} offset ${(page - 1) * PAGE}`, p),
    q1<{ n: number }>(`select count(*)::int n ${from}`, p),
    q1<{ total: number; active: number; suspended: number; buyers: number }>(
      `select (select count(*)::int from user_roles where role = 'buyer') total,
              (select count(*)::int from users u join user_roles r on r.user_id = u.id and r.role = 'buyer' where u.status = 'active') active,
              (select count(*)::int from users u join user_roles r on r.user_id = u.id and r.role = 'buyer' where u.status = 'suspended') suspended,
              (select count(distinct buyer_id)::int from parent_orders where status <> 'placed') buyers`),
  ]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PAGE));
  const href = (n: number) => qs("/admin/customers", { q: sp.q, status: sp.status, page: String(n) });
  return (
    <>
      <PageTitle title="Customers" /><Flash err={sp.err} msg={sp.msg} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total customers" value={stats?.total ?? 0} tone={0} icon="users" /><Stat label="Active" value={stats?.active ?? 0} tone={1} icon="check" />
        <Stat label="Have ordered" value={stats?.buyers ?? 0} tone={2} icon="cart" /><Stat label="Suspended" value={stats?.suspended ?? 0} tone={3} icon="x" />
      </div>
      <FilterBar action="/admin/customers" q={sp.q} selects={[{ name: "status", label: "Status", value: sp.status, options: [["active", "Active"], ["suspended", "Suspended"]] }]} />
      <Table head={["Name", "Email", "Orders", "Spent", "Joined", "Status", "Action"]} empty={rows.length ? undefined : "No customers match."}>
        {rows.map((r) => <tr key={r.id}><Td>{r.full_name}</Td><Td>{r.email}</Td><Td>{r.orders}</Td><Td>{formatINR(r.spent)}</Td><Td>{new Date(r.created_at).toLocaleDateString("en-IN")}</Td><Td><Badge color={statusColor(r.status)}>{label(r.status)}</Badge></Td>
          <Td><form action={customerStatusAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={r.status === "active" ? "suspended" : "active"} /><button className={`${r.status === "active" ? btnDanger : btn2} ${btnSm}`}>{r.status === "active" ? "Suspend" : "Reactivate"}</button></form></Td></tr>)}</Table>
      <NumberPager page={page} pages={pages} href={href} />
    </>
  );
}
