import Link from "next/link";
import { getUser } from "@/lib/server/auth";
import { buyerOrders } from "@/lib/server/orders";
import { formatINR } from "@/lib/money";
import { Badge, card, Flash, label, PageTitle, statusColor } from "@/components/ui";

export const metadata = { title: "My account" };

export default async function Overview({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  const user = (await getUser())!;
  const orders = await buyerOrders(user.id);
  return (
    <>
      <PageTitle title={`Hello, ${user.name?.split(" ")[0] ?? "there"}`} sub={user.email} />
      <Flash {...sp} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={card}><p className="text-sm text-muted">Orders</p><p className="text-3xl">{orders.length}</p></div>
        <div className={card}><p className="text-sm text-muted">Total spent</p><p className="text-3xl">{formatINR(orders.filter((o) => o.status !== "cancelled").reduce((a, o) => a + o.total_paise, 0))}</p></div>
      </div>
      <h2 className="mb-3 mt-8 text-2xl">Recent orders</h2>
      {orders.length === 0 ? <p className="text-sm text-muted">No orders yet. <Link href="/discover" className="text-forest underline">Start exploring</Link></p> : (
        <ul className="space-y-3">{orders.slice(0, 5).map((o) => <li key={o.id}><Link href={`/account/orders/${o.order_number}`} className={`${card} flex items-center justify-between text-sm hover:border-forest`}>
          <span><b>{o.order_number}</b> · {new Date(o.created_at).toLocaleDateString("en-IN")} · {o.item_count} items</span><span className="flex items-center gap-3"><Badge color={statusColor(o.status)}>{label(o.status)}</Badge>{formatINR(o.total_paise)}</span></Link></li>)}</ul>)}
    </>
  );
}
