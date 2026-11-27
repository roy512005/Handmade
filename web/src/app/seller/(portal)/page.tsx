import Link from "next/link";
import { requireSeller } from "@/lib/server/auth";
import { sellerDashboard } from "@/lib/server/seller";
import { formatINR } from "@/lib/money";
import { describeNotification } from "@/lib/notificationText";
import { BarChart, card, Flash, PageTitle, ProgressSplit, PromoCard, Stat } from "@/components/ui";
import { greeting } from "@/lib/greeting";

export const metadata = { title: "Seller dashboard" };

export default async function SellerHome({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  const u = await requireSeller();
  const d = await sellerDashboard(u.sellerId);
    const prep = d.counts.pending, shipped = d.counts.shipped, done = d.counts.completed;
  const pct = d.counts.total ? Math.round((done / d.counts.total) * 100) : 0;
  return (
    <>
      <PageTitle title={greeting(u.name)} sub="Stay on top of your orders, stock and earnings." /><Flash {...sp} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total sales" value={formatINR(d.counts.sales)} sub={`${d.counts.total} orders`} tone={0} icon="rupee" />
        <Stat label="Orders to handle" value={prep} sub={prep ? "Need your attention" : "All caught up"} tone={1} icon="cart" />
        <Stat label="Active products" value={d.products.active} sub={`${d.products.listed} listed`} tone={2} icon="box" />
        <Stat label="Available balance" value={formatINR(Math.max(0, d.bal.available))} sub={`${formatINR(Math.max(0, d.bal.pending))} pending`} tone={3} icon="wallet" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className={card}><h2 className="text-lg">Sales — last 14 days</h2>
          <div className="mt-4"><BarChart labelEvery={2} data={d.chart.map((c) => ({ label: c.day.slice(0, 2), value: c.total, display: formatINR(c.total) }))} /></div></section>
        <section className={card}><h2 className="text-xl">Order progress</h2>
          <p className="mt-3 text-4xl font-semibold">{pct}%</p><p className="mb-3 text-sm text-muted">of your orders delivered</p>
          <ProgressSplit parts={[{ label: "Delivered", value: done, color: "#111411" }, { label: "Shipped", value: shipped, color: "#8FEA12" }, { label: "To prepare", value: prep, color: "#F0742F" }]} />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {[["Delivered", done], ["Shipped", shipped], ["To prepare", prep]].map(([l, n]) => <div key={l as string} className="rounded-control bg-ivory p-3"><p className="text-xl font-semibold">{n}</p><p className="text-muted">{l}</p></div>)}</div></section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className={card}><h2 className="text-xl">Recent activity</h2>
          {d.recent.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing yet.</p> : <ul className="mt-3 divide-y divide-line text-sm">{d.recent.map((n) => <li key={n.id} className="flex justify-between gap-3 py-2.5"><span>{describeNotification(n.type, n.payload)}</span><span className="shrink-0 text-xs text-muted">{new Date(n.created_at).toLocaleDateString("en-IN")}</span></li>)}</ul>}
          {d.lowStock.length > 0 && <div className="mt-4 border-t border-line pt-3 text-sm"><p className="font-medium text-terracotta">Low stock</p>{d.lowStock.map((l) => <p key={l.id}><Link href={`/seller/products/${l.id}`} className="underline">{l.title}</Link> — {l.left} left</p>)}</div>}</section>
        <PromoCard title="Make every piece shine" text="Shops with 3+ clear photos per product sell more. Add a new piece or refresh your photos." href="/seller/products/new" cta="Add a product" />
      </div>
    </>
  );
}
