import Link from "next/link";
import { getUser } from "@/lib/server/auth";
import { buyerOrders } from "@/lib/server/orders";
import { formatINR } from "@/lib/money";
import { Badge, card, label, PageTitle, statusColor } from "@/components/ui";

export const metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = (await getUser())!;
  const orders = await buyerOrders(user.id);
  return (
    <>
      <PageTitle title="My orders" />
      {orders.length === 0 ? <p className="text-sm text-muted">You haven&apos;t placed any orders yet.</p> : (
        <ul className="space-y-3">{orders.map((o) => <li key={o.id}><Link href={o.status === "placed" ? `/pay/${o.order_number}` : `/account/orders/${o.order_number}`} className={`${card} flex flex-wrap items-center justify-between gap-2 text-sm hover:border-forest`}>
          <span><b>{o.order_number}</b> · {new Date(o.created_at).toLocaleDateString("en-IN")} · {o.item_count} items</span>
          <span className="flex items-center gap-3"><Badge color={statusColor(o.status)}>{o.status === "placed" ? "Awaiting payment" : label(o.status)}</Badge>{formatINR(o.total_paise)}</span></Link></li>)}</ul>)}
    </>
  );
}
