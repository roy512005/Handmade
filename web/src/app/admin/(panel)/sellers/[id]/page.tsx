import Link from "next/link";
import { notFound } from "next/navigation";
import { can, requireAdmin } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { isUuid } from "@/lib/server/catalog";
import { sellerBalances } from "@/lib/server/ledger";
import { getSettings } from "@/lib/server/settings";
import { formatINR } from "@/lib/money";
import { sellerCommissionAction, sellerDecisionAction } from "@/app/actions/admin";
import { Badge, btn, btn2, btnDanger, card, Flash, input, label, PageTitle, Stat, statusColor, Table, Td } from "@/components/ui";

export const metadata = { title: "Seller" };

export default async function AdminSeller({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const [{ id }, sp, admin] = await Promise.all([params, searchParams, requireAdmin("sellers")]);
  if (!isUuid(id)) notFound();
  const s = await q1<{ id: string; brand_name: string; email: string; phone: string | null; full_name: string | null; seller_type: string; status: string; story: string | null; pan_last4: string | null; commission_bps: number | null; rejection_reason: string | null; created_at: string }>(
    "select s.*, u.email, u.phone, u.full_name from seller_profiles s join users u on u.id = s.user_id where s.id = $1", [id]);
  if (!s) notFound();
  const [docs, products, orders, addr, bank, bal, settings] = await Promise.all([
    q<{ id: string; doc_type: string; created_at: string }>("select id, doc_type, created_at from seller_documents where seller_id = $1 order by created_at", [id]),
    q<{ id: string; title: string; status: string; price_paise: number }>("select id, title, status, price_paise from products where seller_id = $1 order by created_at desc", [id]),
    q<{ suborder_number: string; order_number: string; status: string; subtotal_paise: number }>("select so.suborder_number, po.order_number, so.status, so.subtotal_paise from seller_suborders so join parent_orders po on po.id = so.parent_order_id where so.seller_id = $1 and so.status <> 'placed' order by so.created_at desc limit 20", [id]),
    q1<{ line1: string; city: string; state: string; pincode: string }>("select line1, city, state, pincode from addresses where seller_id = $1 and kind = 'pickup'", [id]),
    q1<{ account_holder: string; account_last4: string; ifsc: string }>("select account_holder, account_last4, ifsc from seller_bank_accounts where seller_id = $1", [id]),
    sellerBalances(id), getSettings(),
  ]);
  const act = (op: string, text: string, cls = btn, withReason = false) => (
    <form action={sellerDecisionAction} className="flex gap-2"><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} />
      {withReason && <input name="reason" placeholder="Reason" className={`${input} !w-52`} />}<button className={cls}>{text}</button></form>);
  return (
    <>
      <Link href="/admin/sellers" className="text-sm text-muted">← Sellers</Link>
      <PageTitle title={s.brand_name} sub={`${s.full_name} · ${s.email} · ${s.phone ?? ""}`} action={<Badge color={statusColor(s.status)}>{label(s.status)}</Badge>} /><Flash {...sp} />
      <div className="mb-6 flex flex-wrap gap-3">
        {["pending", "under_review", "rejected"].includes(s.status) && act("approve", "Approve seller")}
        {s.status === "pending" && act("review", "Mark under review", btn2)}
        {["pending", "under_review"].includes(s.status) && act("reject", "Reject", btnDanger, true)}
        {s.status === "approved" && act("suspend", "Suspend", btnDanger, true)}
        {s.status === "suspended" && act("reactivate", "Reactivate")}
      </div>
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="Pending earnings" value={formatINR(bal.pending)} /><Stat label="Available" value={formatINR(bal.available)} /><Stat label="Paid out" value={formatINR(bal.settled)} /></div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={`${card} text-sm`}><h2 className="text-xl">Details</h2>
          <p className="mt-2">Type: {label(s.seller_type)} · PAN ends {s.pan_last4}</p>
          {addr && <p>Pickup: {addr.line1}, {addr.city}, {addr.state} {addr.pincode}</p>}{bank && <p>Bank: {bank.account_holder} · ••••{bank.account_last4} · {bank.ifsc}</p>}
          <p className="mt-2 text-muted">{s.story}</p>
          {s.rejection_reason && <p className="mt-2 text-error">Last reason: {s.rejection_reason}</p>}</section>
        <section className={card}><h2 className="text-xl">Verification documents</h2>
          <ul className="mt-2 space-y-1 text-sm">{docs.map((d) => <li key={d.id}>{label(d.doc_type)} · {new Date(d.created_at).toLocaleDateString("en-IN")} · <a className="text-forest underline" href={`/admin/documents/${d.id}`} target="_blank" rel="noopener noreferrer">Open</a></li>)}{docs.length === 0 && <li className="text-muted">None uploaded yet.</li>}</ul>
          {can(admin, "finance") && <form action={sellerCommissionAction} className="mt-4 flex items-end gap-2 border-t border-line pt-3 text-sm"><input type="hidden" name="id" value={id} />
            <div><label htmlFor="percent" className="mb-1 block font-medium">Commission % (blank = default {settings.commissionBps / 100}%)</label><input id="percent" name="percent" defaultValue={s.commission_bps === null ? "" : s.commission_bps / 100} className={`${input} !w-28`} /></div><button className={btn2}>Set</button></form>}</section>
      </div>
      <h2 className="mb-3 mt-8 text-2xl">Products</h2>
      <Table head={["Product", "Price", "Status"]} empty={products.length ? undefined : "No products."}>{products.map((p) => <tr key={p.id}><Td>{p.title}</Td><Td>{formatINR(p.price_paise)}</Td><Td><Badge color={statusColor(p.status)}>{label(p.status)}</Badge></Td></tr>)}</Table>
      <h2 className="mb-3 mt-8 text-2xl">Recent orders</h2>
      <Table head={["Suborder", "Order", "Amount", "Status"]} empty={orders.length ? undefined : "No orders."}>{orders.map((o) => <tr key={o.suborder_number}><Td>{o.suborder_number}</Td><Td><Link className="text-forest underline" href={`/admin/orders/${o.order_number}`}>{o.order_number}</Link></Td><Td>{formatINR(o.subtotal_paise)}</Td><Td><Badge color={statusColor(o.status)}>{label(o.status)}</Badge></Td></tr>)}</Table>
    </>
  );
}
