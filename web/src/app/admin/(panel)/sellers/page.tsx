import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { Badge, btn2, btnSm, FilterBar, Flash, label, NumberPager, PageTitle, qs, Stat, statusColor, Table, Td } from "@/components/ui";

export const metadata = { title: "Sellers" };
const PAGE = 10;
const STATUSES = ["pending", "under_review", "approved", "rejected", "suspended"];
const TYPES = ["individual_artisan", "handmade_creator", "small_business", "registered_business"];
type Sp = { q?: string; status?: string; type?: string; page?: string; msg?: string; err?: string };

export default async function AdminSellers({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  await requireAdmin("sellers");
  const page = Math.max(1, Number(sp.page) || 1);
  const p: unknown[] = []; let w = "true";
  if (sp.q?.trim()) { p.push(`%${sp.q.trim()}%`); w += ` and (s.brand_name ilike $${p.length} or u.email ilike $${p.length} or u.full_name ilike $${p.length})`; }
  if (STATUSES.includes(sp.status ?? "")) { p.push(sp.status); w += ` and s.status = $${p.length}`; }
  if (TYPES.includes(sp.type ?? "")) { p.push(sp.type); w += ` and s.seller_type = $${p.length}`; }
  const from = `from seller_profiles s join users u on u.id = s.user_id where ${w}`;
  const [rows, total, stats] = await Promise.all([
    q<{ id: string; brand_name: string; email: string; seller_type: string; status: string; created_at: string; products: number; gmv: number }>(
      `select s.id, s.brand_name, u.email, s.seller_type, s.status, s.created_at,
         (select count(*)::int from products pr where pr.seller_id = s.id) products,
         coalesce((select sum(so.subtotal_paise) from seller_suborders so where so.seller_id = s.id and so.status not in ('placed','cancelled','refunded')),0) gmv ${from}
       order by (s.status in ('pending','under_review')) desc, s.created_at desc limit ${PAGE} offset ${(page - 1) * PAGE}`, p),
    q1<{ n: number }>(`select count(*)::int n ${from}`, p),
    q1<{ total: number; approved: number; pending: number; other: number }>(
      `select count(*)::int total, count(*) filter (where status = 'approved')::int approved, count(*) filter (where status in ('pending','under_review'))::int pending,
              count(*) filter (where status in ('rejected','suspended'))::int other from seller_profiles`),
  ]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PAGE));
  const href = (n: number) => qs("/admin/sellers", { q: sp.q, status: sp.status, type: sp.type, page: String(n) });
  return (
    <>
      <PageTitle title="Sellers" /><Flash err={sp.err} msg={sp.msg} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total sellers" value={stats?.total ?? 0} tone={0} icon="store" /><Stat label="Approved" value={stats?.approved ?? 0} tone={1} icon="check" />
        <Stat label="Awaiting review" value={stats?.pending ?? 0} tone={2} icon="layers" /><Stat label="Rejected / suspended" value={stats?.other ?? 0} tone={3} icon="alert" />
      </div>
      <FilterBar action="/admin/sellers" q={sp.q} selects={[
        { name: "status", label: "Status", value: sp.status, options: STATUSES.map((s) => [s, label(s)]) },
        { name: "type", label: "Seller type", value: sp.type, options: TYPES.map((s) => [s, label(s)]) },
      ]} />
      <Table head={["Brand", "Email", "Type", "Products", "GMV", "Status", "Applied", "Action"]} empty={rows.length ? undefined : "No sellers match."}>
        {rows.map((r) => <tr key={r.id}><Td><Link href={`/admin/sellers/${r.id}`} className="font-medium text-forest underline">{r.brand_name}</Link></Td><Td>{r.email}</Td><Td>{label(r.seller_type)}</Td><Td>{r.products}</Td><Td>{formatINR(r.gmv)}</Td>
          <Td><Badge color={statusColor(r.status)}>{label(r.status)}</Badge></Td><Td>{new Date(r.created_at).toLocaleDateString("en-IN")}</Td><Td><Link href={`/admin/sellers/${r.id}`} className={`${btn2} ${btnSm}`}>{["pending", "under_review"].includes(r.status) ? "Review" : "View"}</Link></Td></tr>)}</Table>
      <NumberPager page={page} pages={pages} href={href} />
    </>
  );
}
