import Link from "next/link";
import { requireSeller } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { PageTitle, Stat } from "@/components/ui";

export const metadata = { title: "Customer reviews" };

export default async function SellerReviews() {
  const u = await requireSeller();
  const [stats, rows] = await Promise.all([
    q1<{ n: number; avg: number | null }>("select count(*)::int n, avg(r.rating)::float8 avg from reviews r join products p on p.id = r.product_id where p.seller_id = $1 and r.status = 'published'", [u.sellerId]),
    q<{ id: string; rating: number; body: string | null; created_at: string; title: string; product_id: string; name: string | null }>(
      `select r.id, r.rating, r.body, r.created_at, p.title, p.id product_id, usr.full_name name from reviews r join products p on p.id = r.product_id join users usr on usr.id = r.user_id
       where p.seller_id = $1 and r.status = 'published' order by r.created_at desc limit 100`, [u.sellerId]),
  ]);
  return (
    <>
      <PageTitle title="Customer reviews" sub="Only buyers who received a piece can review it." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Reviews" value={stats?.n ?? 0} tone={0} icon="check" /><Stat label="Average rating" value={stats?.avg ? `${stats.avg.toFixed(1)} ★` : "—"} tone={2} icon="layers" /></div>
      {rows.length === 0 ? <p className="text-sm text-muted">No reviews yet.</p> : (
        <ul className="divide-y divide-line rounded-card border border-line">{rows.map((r) => (
          <li key={r.id} className="px-5 py-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-terracotta" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p><p className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString("en-IN")}</p></div>
            {r.body && <p className="mt-1">{r.body}</p>}<p className="mt-1 text-xs text-muted">{r.name ?? "Customer"} on <Link href={`/products/${r.product_id}`} className="underline">{r.title}</Link></p></li>))}</ul>)}
    </>
  );
}
