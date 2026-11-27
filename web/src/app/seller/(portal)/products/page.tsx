import Link from "next/link";
import { requireSeller } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { Badge, btn, btn2, btnSm, FilterBar, Flash, label, NumberPager, PageTitle, ProductImage, Stat, statusColor, stockInfo, Table, Td } from "@/components/ui";

export const metadata = { title: "My products" };
const PAGE = 10;
const STATUSES = ["draft", "pending_approval", "approved", "rejected", "paused"];
type Sp = { q?: string; category?: string; status?: string; stock?: string; page?: string; msg?: string; err?: string };

export default async function SellerProducts({ searchParams }: { searchParams: Promise<Sp> }) {
  const sp = await searchParams;
  const u = await requireSeller();
  const page = Math.max(1, Number(sp.page) || 1);

  const params: unknown[] = [u.sellerId];
  let where = "p.seller_id = $1 and p.status <> 'archived'";
  if (sp.q?.trim()) { params.push(`%${sp.q.trim()}%`); where += ` and p.title ilike $${params.length}`; }
  if (sp.category) { params.push(sp.category); where += ` and c.slug = $${params.length}`; }
  if (STATUSES.includes(sp.status ?? "")) { params.push(sp.status); where += ` and p.status = $${params.length}`; }
  const base = `select p.id, p.title, p.status, p.price_paise, p.updated_at, c.name category, (select url from product_images where product_id = p.id order by position limit 1) image,
      coalesce((select sum(i.on_hand - i.reserved) from product_variants v join product_inventory i on i.variant_id = v.id where v.product_id = p.id and v.active),0)::int stock
    from products p join categories c on c.id = p.category_id where ${where}`;
  const stockWhere = sp.stock === "in" ? "where stock > 5" : sp.stock === "low" ? "where stock between 1 and 5" : sp.stock === "out" ? "where stock <= 0" : "";

  const [rows, total, stats, cats] = await Promise.all([
    q<{ id: string; title: string; status: string; price_paise: number; updated_at: string; category: string; image: string | null; stock: number }>(
      `select * from (${base}) x ${stockWhere} order by updated_at desc limit ${PAGE} offset ${(page - 1) * PAGE}`, params),
    q1<{ n: number }>(`select count(*)::int n from (${base}) x ${stockWhere}`, params),
    q1<{ total: number; instock: number; low: number; out: number }>(
      `select count(*)::int total, count(*) filter (where stock > 5)::int instock, count(*) filter (where stock between 1 and 5)::int low, count(*) filter (where stock <= 0)::int out
       from (select coalesce((select sum(i.on_hand - i.reserved) from product_variants v join product_inventory i on i.variant_id = v.id where v.product_id = p.id and v.active),0) stock
             from products p where p.seller_id = $1 and p.status <> 'archived') s`, [u.sellerId]),
    q<{ slug: string; name: string }>("select slug, name from categories where active order by sort_order"),
  ]);
  const pages = Math.max(1, Math.ceil((total?.n ?? 0) / PAGE));
  const href = (p: number) => { const x = new URLSearchParams(); for (const [k, v] of Object.entries({ q: sp.q, category: sp.category, status: sp.status, stock: sp.stock, page: String(p) })) if (v) x.set(k, v); return `/seller/products?${x}`; };

  return (
    <>
      <PageTitle title="My products" action={u.sellerStatus === "approved" ? <Link href="/seller/products/new" className={btn}>Add product</Link> : undefined} />
      <Flash err={sp.err} msg={sp.msg} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total products" value={stats?.total ?? 0} tone={0} icon="box" /><Stat label="In stock" value={stats?.instock ?? 0} tone={1} icon="check" />
        <Stat label="Low stock (5 or fewer)" value={stats?.low ?? 0} tone={2} icon="alert" /><Stat label="Out of stock" value={stats?.out ?? 0} tone={3} icon="x" />
      </div>
      <FilterBar action="/seller/products" q={sp.q} selects={[
        { name: "category", label: "Category", value: sp.category, options: cats.map((c) => [c.slug, c.name]) },
        { name: "status", label: "Status", value: sp.status, options: STATUSES.map((s) => [s, label(s)]) },
        { name: "stock", label: "Stock", value: sp.stock, options: [["in", "In stock"], ["low", "Low stock"], ["out", "Out of stock"]] },
      ]} />
      <Table head={["Product", "Category", "Price", "Quantity", "Stock", "Last updated", "Status", "Action"]} empty={rows.length ? undefined : "No products match."}>
        {rows.map((r) => {
          const st = stockInfo(r.stock);
          return (
            <tr key={r.id}>
              <Td><div className="flex items-center gap-3"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-control border border-line"><ProductImage url={r.image} title={r.title} className="!text-base" /></span>
                <Link href={`/seller/products/${r.id}`} className="font-medium hover:text-forest">{r.title}</Link></div></Td>
              <Td>{r.category}</Td><Td>{formatINR(r.price_paise)}</Td><Td>{Math.max(0, r.stock)} pcs</Td>
              <Td><Badge color={st.color}>{st.text}</Badge></Td><Td>{new Date(r.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Td>
              <Td><Badge color={statusColor(r.status)}>{label(r.status)}</Badge></Td>
              <Td><Link href={`/seller/products/${r.id}`} className={`${btn2} ${btnSm}`}>View</Link></Td>
            </tr>);
        })}
      </Table>
      <NumberPager page={page} pages={pages} href={href} />
    </>
  );
}
