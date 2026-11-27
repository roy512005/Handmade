import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/server/auth";
import { sellerOrder } from "@/lib/server/seller";
import { isUuid } from "@/lib/server/catalog";
import { formatINR } from "@/lib/money";
import { STATUS_LABEL, type SubStatus } from "@/lib/orderState";
import { orderActionAction } from "@/app/actions/seller";
import { Badge, btn, btn2, btnDanger, card, Flash, input, statusColor } from "@/components/ui";

export const metadata = { title: "Order" };

export default async function SellerOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const [{ id }, sp, u] = await Promise.all([params, searchParams, requireSeller()]);
  if (!isUuid(id)) notFound();
  const o = await sellerOrder(u.sellerId, id);
  if (!o) notFound();
  const a = o.shipping_address;
  const st = o.status as SubStatus;
  const act = (action: string, text: string, cls = btn) => <form action={orderActionAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value={action} /><button className={cls}>{text}</button></form>;
  return (
    <div className="max-w-3xl space-y-6">
      <div><Link href="/seller/orders" className="text-sm text-muted">← Orders</Link>
        <h1 className="flex items-center gap-3 text-3xl text-forest">{o.suborder_number} <Badge color={statusColor(st)}>{STATUS_LABEL[st]}</Badge></h1>
        <p className="text-sm text-muted">Part of {o.order_number} · {new Date(o.created_at).toLocaleString("en-IN")}</p></div>
      <Flash {...sp} />
      <section className={card}><h2 className="text-xl">What to make &amp; pack</h2>
        <ul className="mt-3 divide-y divide-line text-sm">{o.items.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.quantity} × {i.title_snapshot}</span><span>{formatINR(i.unit_price_paise * i.quantity)}</span></li>)}</ul></section>
      <section className={card}><h2 className="text-xl">Next step</h2>
        <div className="mt-3 flex flex-wrap items-start gap-3">
          {st === "payment_confirmed" && <>{act("accept", "Accept order")}
            <form action={orderActionAction} className="flex gap-2"><input type="hidden" name="id" value={id} /><input type="hidden" name="action" value="reject" /><input name="reason" placeholder="Reason (e.g. out of stock)" className={`${input} !w-60`} /><button className={btnDanger}>Reject</button></form></>}
          {st === "accepted" && act("prepare", "Start preparing")}
          {st === "preparing" && act("ready", "Mark packed & ready for pickup")}
          {st === "ready_for_pickup" && <p className="text-sm">The courier will collect from your pickup address. <Link href={`/seller/orders/${id}/label`} className={`${btn2} ml-2`}>Print shipping label</Link></p>}
          {["picked_up", "in_transit", "out_for_delivery"].includes(st) && <p className="text-sm text-muted">With the courier — nothing to do.</p>}
          {["delivered", "cancelled", "refunded"].includes(st) && <p className="text-sm text-muted">{st === "delivered" ? "Delivered. Your earnings are released after the return window." : `This order was ${st}.${o.rejected_reason ? ` Reason: ${o.rejected_reason}` : ""}`}</p>}
        </div>
        {o.awb && <p className="mt-3 text-sm text-muted">{o.courier} · AWB {o.awb}</p>}
        <p className="mt-3 text-xs text-muted">Reminder: pack safely and keep the parcel ready at your pickup address.</p></section>
      <section className={`${card} grid gap-4 text-sm sm:grid-cols-2`}>
        <div><h2 className="mb-1 text-lg">Ship to</h2><p className="text-muted">{a.name} · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}</p><p className="mt-1 text-xs text-muted">Use only for fulfilment.</p></div>
        <div className="space-y-1"><h2 className="mb-1 text-lg">Your earnings</h2><p className="flex justify-between"><span className="text-muted">Item total</span>{formatINR(o.subtotal_paise)}</p>
          <p className="flex justify-between"><span className="text-muted">Commission {o.commission ? `(${o.commission.rate_bps / 100}%)` : ""}</span>− {formatINR(o.commission?.amount_paise ?? 0)}</p>
          <p className="flex justify-between border-t border-line pt-1 font-semibold"><span>You receive</span>{formatINR(o.subtotal_paise - (o.commission?.amount_paise ?? 0))}</p></div></section>
    </div>
  );
}
