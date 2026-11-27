import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/server/auth";
import { orderDetail } from "@/lib/server/orders";
import { BUYER_CANCELLABLE, STATUS_LABEL, type SubStatus } from "@/lib/orderState";
import { formatINR } from "@/lib/money";
import { cancelSuborderAction, returnAction, reviewAction } from "@/app/actions/account";
import { Badge, btn, btnDanger, btnSm, card, Flash, input, statusColor } from "@/components/ui";

export const metadata = { title: "Order details" };
const STEPS: SubStatus[] = ["payment_confirmed", "accepted", "preparing", "ready_for_pickup", "picked_up", "in_transit", "out_for_delivery", "delivered"];

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const [{ number }, sp, user] = await Promise.all([params, searchParams, getUser()]);
  const o = await orderDetail(number, { userId: user!.id });
  if (!o) notFound();
  const a = o.shipping_address;
  return (
    <div className="space-y-6">
      <div><Link href="/account/orders" className="text-sm text-muted">← All orders</Link>
        <h1 className="text-3xl text-forest">Order {o.order_number}</h1>
        <p className="text-sm text-muted">Placed {new Date(o.created_at).toLocaleString("en-IN")}</p></div>
      <Flash {...sp} />
      {o.status === "placed" && <div className={`${card} flex items-center justify-between`}><span className="text-sm">Payment pending.</span><Link href={`/pay/${o.order_number}`} className={btn}>Pay now</Link></div>}
      {o.subs.map((s) => {
        const at = STEPS.indexOf(s.status);
        const closed = ["cancelled", "refunded"].includes(s.status);
        return (
          <section key={s.id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl">Shipment from {s.brand_name}</h2><Badge color={statusColor(s.status)}>{STATUS_LABEL[s.status]}</Badge></div>
            <p className="text-xs text-muted">{s.suborder_number}{s.awb ? ` · ${s.courier} · Tracking ${s.awb}` : ""}</p>
            {!closed && at >= 0 && (
              <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="Progress">
                {STEPS.map((st, i) => <li key={st} className={i <= at ? "font-medium text-forest" : "text-muted"}>{i <= at ? "●" : "○"} {STATUS_LABEL[st]}</li>)}</ol>)}
            {s.rejected_reason && <p className="mt-2 text-sm text-muted">Reason: {s.rejected_reason}</p>}
            <ul className="mt-4 divide-y divide-line text-sm">{s.items.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{i.quantity} × <Link href={`/products/${i.product_id}`} className="underline">{i.title_snapshot}</Link></span>
                <span>{formatINR(i.unit_price_paise * i.quantity)}</span>
                {s.status === "delivered" && !i.reviewed && (
                  <form action={reviewAction} className="flex w-full flex-wrap items-center gap-2 pt-2"><input type="hidden" name="order" value={o.order_number} /><input type="hidden" name="itemId" value={i.id} />
                    <label htmlFor={`r-${i.id}`} className="sr-only">Rating</label>
                    <select id={`r-${i.id}`} name="rating" className={`${input} !w-28`} defaultValue=""><option value="" disabled>Rating</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}</select>
                    <input name="body" placeholder="Write a review (optional)" className={`${input} flex-1`} /><button className={`${btn} ${btnSm}`}>Submit review</button></form>)}</li>))}</ul>
            {s.events.length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer text-forest">Tracking history</summary>
              <ul className="mt-2 space-y-1">{[...s.events].reverse().map((e, i) => <li key={i}>{new Date(e.occurred_at).toLocaleString("en-IN")} — {e.status.replace(/_/g, " ")}{e.location ? ` (${e.location})` : ""}</li>)}</ul></details>}
            <div className="mt-4 flex flex-wrap gap-3">
              {BUYER_CANCELLABLE.includes(s.status) && <form action={cancelSuborderAction}><input type="hidden" name="order" value={o.order_number} /><input type="hidden" name="id" value={s.id} /><button className={btnDanger}>Cancel this shipment</button></form>}
              {s.status === "delivered" && s.returnable && (
                <form action={returnAction} className="flex flex-wrap gap-2"><input type="hidden" name="order" value={o.order_number} /><input type="hidden" name="id" value={s.id} />
                  <input name="reason" placeholder="Reason for return" className={`${input} !w-64`} /><button className={`${btnDanger}`}>Request return</button></form>)}
            </div>
          </section>);
      })}
      <section className={`${card} grid gap-6 text-sm sm:grid-cols-2`}>
        <div><h2 className="mb-1 text-lg">Delivery address</h2><p className="text-muted">{a.name} · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.pincode}</p></div>
        <div className="space-y-1"><h2 className="mb-1 text-lg">Payment</h2>
          <p className="flex justify-between"><span className="text-muted">Subtotal</span>{formatINR(o.subtotal_paise)}</p>
          <p className="flex justify-between"><span className="text-muted">Shipping</span>{formatINR(o.shipping_paise)}</p>
          {o.discount_paise > 0 && <p className="flex justify-between text-forest"><span>Discount</span>− {formatINR(o.discount_paise)}</p>}
          <p className="flex justify-between border-t border-line pt-1 font-semibold"><span>Total</span>{formatINR(o.total_paise)}</p></div>
      </section>
    </div>
  );
}
