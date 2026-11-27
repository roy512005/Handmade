import { demoMode } from "@/lib/server/env";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireAdmin } from "@/lib/server/auth";
import { orderDetail } from "@/lib/server/orders";
import { q } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { NEXT_COURIER } from "@/lib/server/orders";
import { STATUS_LABEL, type SubStatus } from "@/lib/orderState";
import { orderAdminAction } from "@/app/actions/admin";
import { Badge, btn, btn2, btnDanger, btnSm, card, Flash, label, statusColor } from "@/components/ui";

export const metadata = { title: "Order" };

export default async function AdminOrder({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const [{ number }, sp, admin] = await Promise.all([params, searchParams, requireAdmin("orders")]);
  const o = await orderDetail(number, { admin: true });
  if (!o) notFound();
  const refunds = await q<{ amount_paise: number; status: string; created_at: string }>("select r.amount_paise, r.status, r.created_at from refunds r join payments p on p.id = r.payment_id where p.parent_order_id = $1", [o.id]);
  const a = o.shipping_address;
  const btnFor = (subId: string, op: string, text: string, cls = btn2) => <form action={orderAdminAction}><input type="hidden" name="id" value={subId} /><input type="hidden" name="order" value={o.order_number} /><input type="hidden" name="op" value={op} /><button className={`${cls} ${btnSm}`}>{text}</button></form>;
  return (
    <div className="max-w-4xl space-y-6">
      <div><Link href="/admin/orders" className="text-sm text-muted">← Orders</Link><h1 className="flex items-center gap-3 text-3xl text-forest">{o.order_number} <Badge color={statusColor(o.status)}>{label(o.status)}</Badge></h1>
        <p className="text-sm text-muted">{o.buyer_name} · {o.buyer_email} · {new Date(o.created_at).toLocaleString("en-IN")} · payment {o.payment?.status}</p></div>
      <Flash {...sp} />
      {o.subs.map((s) => {
        const st = s.status as SubStatus;
        return (
          <section key={s.id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl">{s.suborder_number} · {s.brand_name}</h2><Badge color={statusColor(st)}>{STATUS_LABEL[st]}</Badge></div>
            <ul className="mt-2 text-sm text-muted">{s.items.map((i) => <li key={i.id}>{i.quantity} × {i.title_snapshot} — {formatINR(i.unit_price_paise * i.quantity)}</li>)}</ul>
            {s.awb && <p className="mt-2 text-sm">{s.courier} · AWB <code>{s.awb}</code></p>}
            {s.events.length > 0 && <details className="mt-2 text-xs"><summary className="cursor-pointer text-forest">Shipment events ({s.events.length})</summary><ul className="mt-1">{s.events.map((e, i) => <li key={i}>{new Date(e.occurred_at).toLocaleString("en-IN")} — {e.status}</li>)}</ul></details>}
            <div className="mt-3 flex flex-wrap gap-2">
              {demoMode() && NEXT_COURIER[st] && btnFor(s.id, "courier_next", `Simulate courier: ${NEXT_COURIER[st]!.replace(/_/g, " ")}`)}
              {demoMode() && ["picked_up", "in_transit", "out_for_delivery"].includes(st) && btnFor(s.id, "courier_fail", "Simulate failed delivery", btnDanger)}
              {["payment_confirmed", "accepted", "preparing", "ready_for_pickup"].includes(st) && btnFor(s.id, "cancel", "Cancel & refund", btnDanger)}
              {st === "return_requested" && <>{btnFor(s.id, "return_approve", "Approve return", btn)}{btnFor(s.id, "return_reject", "Reject return", btnDanger)}</>}
              {["return_in_progress", "delivery_failed"].includes(st) && can(admin, "refunds") && btnFor(s.id, "refund", "Issue refund", btn)}
            </div>
          </section>);
      })}
      <section className={`${card} grid gap-4 text-sm sm:grid-cols-2`}>
        <div><h2 className="mb-1 text-lg">Ship to</h2><p className="text-muted">{a.name} · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</p></div>
        <div><h2 className="mb-1 text-lg">Totals</h2><p>Subtotal {formatINR(o.subtotal_paise)} · Shipping {formatINR(o.shipping_paise)} · Discount {formatINR(o.discount_paise)}</p><p className="font-semibold">Total {formatINR(o.total_paise)}</p>
          {refunds.map((r, i) => <p key={i} className="text-error">Refund {formatINR(r.amount_paise)} ({r.status})</p>)}</div></section>
    </div>
  );
}
