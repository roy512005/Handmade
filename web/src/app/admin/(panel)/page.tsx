import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { adminStats } from "@/lib/server/admin";
import { formatINR } from "@/lib/money";
import { Badge, BarChart, card, Flash, label, PageTitle, PromoCard, Stat, statusColor, Table, Td } from "@/components/ui";
import { greeting } from "@/lib/greeting";

export const metadata = { title: "Admin overview" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string; msg?: string }> }) {
  const sp = await searchParams;
  const admin = await requireAdmin();
  const { money, counts, monthly, cats, txns } = await adminStats();
    return (
    <>
      <PageTitle title={greeting(admin.name)} sub="Here is how the marketplace is doing." />{sp.denied && <Flash err="Your role doesn't have access to that area." />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="GMV" value={formatINR(money.gmv)} sub="Goods sold — not revenue" tone={0} icon="rupee" /><Stat label="Platform revenue" value={formatINR(money.commission)} sub="Commission earned" tone={1} icon="wallet" />
        <Stat label="Orders" value={counts.orders} sub={`${counts.awaitingDispatch} awaiting dispatch`} tone={2} icon="cart" /><Stat label="Customers" value={counts.customers} sub={`${counts.sellers} active sellers`} tone={3} icon="users" />
      </div>
      <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-4 sm:grid-cols-3 [&>*]:h-full">
          <Link href="/admin/sellers?status=pending"><Stat label="Seller applications" value={counts.pendingSellers} sub="Pending review" tone={1} icon="store" /></Link>
          <Link href="/admin/products?status=pending_approval"><Stat label="Product approvals" value={counts.pendingProducts} sub="Waiting for you" tone={2} icon="layers" /></Link>
          <Stat label="Refunds & issues" value={counts.refundRequests} sub={`${formatINR(money.refunds)} refunded`} tone={3} icon="refund" />
        </div>
        <PromoCard title={counts.pendingSellers + counts.pendingProducts ? `${counts.pendingSellers + counts.pendingProducts} items need your review` : "Everything is reviewed"} text="Keep makers moving — fast approvals mean new pieces reach buyers sooner." href={counts.pendingSellers ? "/admin/sellers?status=pending" : "/admin/products?status=pending_approval"} cta="Open review queue" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className={card}><h2 className="text-xl">Monthly sales (GMV)</h2>
          <div className="mt-4"><BarChart data={monthly.map((m) => ({ label: m.month, value: m.total, display: formatINR(m.total) }))} /></div></section>
        <section className={card}><h2 className="text-xl">Best-selling categories</h2>
          {cats.length === 0 ? <p className="mt-3 text-sm text-muted">No sales yet.</p> : <ul className="mt-3 space-y-2 text-sm">{cats.map((c) => <li key={c.name}><div className="flex justify-between"><span>{c.name}</span><span>{formatINR(c.total)}</span></div>
            <div className="mt-1 h-2 rounded bg-sand"><div className="h-2 rounded bg-terracotta" style={{ width: `${(c.total / cats[0].total) * 100}%` }} /></div></li>)}</ul>}</section>
      </div>
      <h2 className="mb-3 mt-8 text-2xl">Recent transactions</h2>
      <Table head={["Order", "Amount", "Status", "When"]} empty={txns.length ? undefined : "No transactions yet."}>
        {txns.map((t) => <tr key={t.id}><Td><Link href={`/admin/orders/${t.order_number}`} className="text-forest underline">{t.order_number}</Link></Td><Td>{formatINR(t.amount_paise)}</Td><Td><Badge color={statusColor(t.status)}>{label(t.status)}</Badge></Td><Td>{new Date(t.created_at).toLocaleString("en-IN")}</Td></tr>)}</Table>
    </>
  );
}
