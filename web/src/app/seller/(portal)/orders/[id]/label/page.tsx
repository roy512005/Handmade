import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/server/auth";
import { sellerOrder } from "@/lib/server/seller";
import { q1 } from "@/lib/server/db";
import { isUuid } from "@/lib/server/catalog";
import { PrintButton } from "@/components/seller/print-button";

export const metadata = { title: "Shipping label" };

export default async function LabelPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, u] = await Promise.all([params, requireSeller()]);
  if (!isUuid(id)) notFound();
  const o = await sellerOrder(u.sellerId, id);
  if (!o || !o.awb) notFound();
  const from = await q1<{ name: string; phone: string; line1: string; city: string; state: string; pincode: string }>("select name, phone, line1, city, state, pincode from addresses where seller_id = $1 and kind = 'pickup'", [u.sellerId]);
  const a = o.shipping_address;
  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-4 flex justify-between print:hidden"><a href={`/seller/orders/${id}`} className="text-sm underline">← Back</a><PrintButton /></div>
      <div className="space-y-4 border-2 border-charcoal bg-white p-5 text-sm">
        <div className="flex items-center justify-between border-b border-charcoal pb-2"><b>{o.courier}</b><span className="font-mono text-lg tracking-widest">{o.awb}</span></div>
        <div><p className="text-xs uppercase text-muted">Deliver to</p><p className="text-base font-semibold">{a.name}</p><p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} — <b>{a.pincode}</b></p><p>Ph: {a.phone}</p></div>
        <div className="border-t border-dashed border-charcoal pt-2"><p className="text-xs uppercase text-muted">From</p><p>{from?.name}, {from?.line1}, {from?.city}, {from?.state} {from?.pincode}</p></div>
        <div className="border-t border-dashed border-charcoal pt-2 text-xs">Order {o.order_number} · {o.suborder_number} · {o.items.reduce((n, i) => n + i.quantity, 0)} item(s) · Prepaid</div>
      </div>
    </div>
  );
}
