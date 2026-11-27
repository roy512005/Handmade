import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { productDecisionAction } from "@/app/actions/admin";
import { Badge, btn, btn2, btnDanger, btnSm, FilterBar, Flash, input, label, NumberPager, PageTitle, ProductImage, Stat, statusColor, Table, Td } from "@/components/ui";

export const metadata = { title: "Products" };
const PAGE = 10;
const STATUSES = ["pending_approval", "approved", "rejected", "paused", "draft"];
type Sp = { q?: string; category?: string; status?: string; seller?: string; page?: string; msg?: string; err?: string };

export default async function AdminProducts({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  await requireAdmin("products");
  const page = Math.max(1, Number(sp.page) || 1);
  const params: unknown[] = [];
  let where = "p.status <> 'archived'";
  if (sp.q?.trim()) { params.push(`%${sp.q.trim()}%`); where += ` and (p.title ilike $${params.length} or s.brand_name ilike $${params.length})`; }
  if (sp.category) { params.push(sp.category); where += ` and c.slug = $${params.length}`; }
  if (sp.seller) { params.push(sp.seller); where += ` and s.id::text = $${params.length}`; }
  if (STATUSES.includes(sp.status ?? "")) { params.push(sp.status); where += ` and p.status = $${params.length}`; }
  const from = `from products p join seller_profiles s on s.id = p.seller_id join categories c on c.id = p.category_id where ${where}`;

  const [rows, total, stats, cats, sellers] = await Promise.all([
    q<{ id: string; title: string; status: string; price_paise: number; featured: boolean; brand_name: string; category: string; image: string | null; description: string }>(
      `select p.id, p.title, p.status, p.price_paise, p.featured, p.description, s.brand_name, c.name category,
         (select url from product_images where product_id = p.id order by position limit 1) image ${from}
       order by (p.status = 'pending_approval') desc, p.created_at desc limit ${PAGE} offset ${(page - 1) * PAGE}`, params),
    q1<{ n: number }>(`select count(*)::int n ${from}`, params),
    q1<{ total: number; live: number; pending: number; other: number }>(
      `select count(*)::int total, count(*) filter (where status = 'approved')::int live, count(*) filter (where status = 'pending_approval')::int pending,
              count(*) filter (where status in ('rejected','paused'))::int other from products where status <> 'archived'`),
    q<{ slug: string; name: string }>("select slug, name from categories order by sort_order"),
    q<{ id: string; brand_name: string }>("select id, brand_name from seller_profiles order by brand_name"),
  ]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PAGE));
  const href = (p: number) => { const x = new URLSearchParams(); for (const [k, v] of Object.entries({ q: sp.q, category: sp.category, status: sp.status, seller: sp.seller, page: String(p) })) if (v) x.set(k, v); return `/admin/products?${x}`; };
  const here = href(page);
  const hidden = (id: string, op: string) => <><input type="hidden" name="id" value={id} /><input type="hidden" name="back" value={here} /><input type="hidden" name="op" value={op} /></>;

  return (
    <>
      <PageTitle title="Products" /><Flash err={sp.err} msg={sp.msg} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total products" value={stats?.total ?? 0} tone={0} icon="box" /><Stat label="Live in store" value={stats?.live ?? 0} tone={1} icon="check" />
        <Stat label="Awaiting approval" value={stats?.pending ?? 0} tone={2} icon="layers" /><Stat label="Rejected / paused" value={stats?.other ?? 0} tone={3} icon="alert" />
      </div>
      <FilterBar action="/admin/products" q={sp.q} selects={[
        { name: "category", label: "Category", value: sp.category, options: cats.map((c) => [c.slug, c.name]) },
        { name: "seller", label: "Seller", value: sp.seller, options: sellers.map((s) => [s.id, s.brand_name]) },
        { name: "status", label: "Status", value: sp.status, options: STATUSES.map((s) => [s, label(s)]) },
      ]} />
      <Table head={["Product", "Seller", "Category", "Price", "Status", "Action"]} empty={rows.length ? undefined : "Nothing here."}>
        {rows.map((r) => (
          <tr key={r.id}>
            <Td className="max-w-xs"><div className="flex items-start gap-3"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-control border border-line"><ProductImage url={r.image} title={r.title} className="!text-base" /></span>
              <div><span className="font-medium">{r.title}</span>{r.featured && <span className="ml-1 text-terracotta" title="Featured">★</span>}<br /><span className="line-clamp-2 text-xs text-muted">{r.description}</span></div></div></Td>
            <Td>{r.brand_name}</Td><Td>{r.category}</Td><Td>{formatINR(r.price_paise)}</Td><Td><Badge color={statusColor(r.status)}>{label(r.status)}</Badge></Td>
            <Td><div className="flex flex-col gap-2">
              {r.status === "pending_approval" && <>
                <form action={productDecisionAction}>{hidden(r.id, "approve")}<button className={`${btn} ${btnSm}`}>Approve</button></form>
                <form action={productDecisionAction} className="flex gap-1">{hidden(r.id, "reject")}<input name="reason" placeholder="Reason" aria-label="Rejection reason" className={`${input} !w-28 !py-1 text-xs`} /><button className={`${btnDanger} ${btnSm}`}>Reject</button></form></>}
              {r.status === "approved" && <div className="flex gap-1">
                <form action={productDecisionAction}>{hidden(r.id, r.featured ? "unfeature" : "feature")}<button className={`${btn2} ${btnSm}`}>{r.featured ? "Unfeature" : "Feature"}</button></form>
                <form action={productDecisionAction}>{hidden(r.id, "pause")}<button className={`${btn2} ${btnSm}`}>Hide</button></form></div>}
              {["paused", "rejected"].includes(r.status) && <form action={productDecisionAction}>{hidden(r.id, "remove")}<button className={`${btnDanger} ${btnSm}`}>Remove</button></form>}
              <Link href={`/products/${r.id}`} className="text-xs text-forest underline">Preview</Link>
            </div></Td>
          </tr>))}
      </Table>
      <NumberPager page={page} pages={pages} href={href} />
    </>
  );
}
