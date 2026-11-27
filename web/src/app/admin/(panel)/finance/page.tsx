/* eslint-disable @next/next/no-html-link-for-pages -- CSV downloads are route handlers, not pages */
import Link from "next/link";
import { requireAdmin } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { listSettlements, releaseDueLedger, sellerBalances } from "@/lib/server/ledger";
import { formatINR } from "@/lib/money";
import { settleAction } from "@/app/actions/admin";
import { Badge, btn, btnSm, Flash, label, PageTitle, Stat, statusColor, Table, Td } from "@/components/ui";

export const metadata = { title: "Finance" };

export default async function Finance({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin("finance");
  await releaseDueLedger();
  const sellers = await q<{ id: string; brand_name: string }>("select id, brand_name from seller_profiles where status in ('approved','suspended') order by brand_name");
  const balances = await Promise.all(sellers.map(async (s) => ({ ...s, b: await sellerBalances(s.id) })));
  const [payments, failed, refunds, settlements, recon] = await Promise.all([
    q<{ order_number: string; amount_paise: number; status: string; method: string | null; created_at: string; provider_payment_id: string }>("select po.order_number, p.amount_paise, p.status, p.method, p.created_at, p.provider_payment_id from payments p join parent_orders po on po.id = p.parent_order_id order by p.created_at desc limit 15"),
    q<{ n: number }>("select count(*)::int n from payments where status = 'failed'"),
    q<{ order_number: string; suborder_number: string; amount_paise: number; status: string; created_at: string }>("select po.order_number, so.suborder_number, r.amount_paise, r.status, r.created_at from refunds r join payments p on p.id = r.payment_id join parent_orders po on po.id = p.parent_order_id left join seller_suborders so on so.id = r.suborder_id order by r.created_at desc limit 15"),
    listSettlements(),
    q<{ captured: number; refunded: number; held: number; commission: number }>(
      `select coalesce(sum(amount_paise) filter (where status in ('captured','partially_refunded','refunded')),0) captured,
              coalesce((select sum(amount_paise) from refunds where status = 'processed'),0) refunded,
              coalesce((select sum(amount_paise) from seller_ledger_entries where status in ('pending','available') and entry_type <> 'commission' and entry_type <> 'commission_reversal'),0) held,
              coalesce((select sum(amount_paise) from commissions),0) commission from payments`),
  ]);
  const r = recon[0];
  return (
    <>
      <PageTitle title="Finance" action={<span className="flex gap-3 text-sm"><a className="text-forest underline" href="/admin/export/transactions">Export transactions CSV</a><a className="text-forest underline" href="/admin/export/ledger">Export ledger CSV</a></span>} /><Flash {...sp} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4"><Stat label="Payments captured" value={formatINR(r.captured)} /><Stat label="Refunded" value={formatINR(r.refunded)} /><Stat label="Platform commission (gross)" value={formatINR(r.commission)} /><Stat label="Failed payments" value={failed[0].n} /></div>
      <h2 className="mb-3 mt-8 text-2xl">Seller balances &amp; settlements</h2>
      <Table head={["Seller", "Pending", "Available", "Paid out", ""]}>{balances.map((s) => <tr key={s.id}><Td><Link className="text-forest underline" href={`/admin/sellers/${s.id}`}>{s.brand_name}</Link></Td><Td>{formatINR(s.b.pending)}</Td><Td>{formatINR(s.b.available)}</Td><Td>{formatINR(s.b.settled)}</Td>
        <Td>{s.b.available > 0 && <form action={settleAction}><input type="hidden" name="id" value={s.id} /><button className={`${btn} ${btnSm}`}>Settle {formatINR(s.b.available)}</button></form>}</Td></tr>)}</Table>
      <h2 className="mb-3 mt-8 text-2xl">Settlement history</h2>
      <Table head={["Date", "Seller", "Amount", "Status"]} empty={settlements.length ? undefined : "No settlements yet."}>{settlements.map((s) => <tr key={s.id}><Td>{new Date(s.created_at).toLocaleDateString("en-IN")}</Td><Td>{s.brand_name}</Td><Td>{formatINR(s.amount_paise)}</Td><Td><Badge color={statusColor(s.status)}>{label(s.status)}</Badge></Td></tr>)}</Table>
      <h2 className="mb-3 mt-8 text-2xl">Payment transactions</h2>
      <Table head={["Order", "Gateway ref", "Amount", "Status", "When"]} empty={payments.length ? undefined : "None."}>{payments.map((p) => <tr key={p.provider_payment_id}><Td>{p.order_number}</Td><Td className="font-mono text-xs">{p.provider_payment_id}</Td><Td>{formatINR(p.amount_paise)}</Td><Td><Badge color={statusColor(p.status)}>{label(p.status)}</Badge></Td><Td>{new Date(p.created_at).toLocaleString("en-IN")}</Td></tr>)}</Table>
      <h2 className="mb-3 mt-8 text-2xl">Refunds</h2>
      <Table head={["Order", "Suborder", "Amount", "Status", "When"]} empty={refunds.length ? undefined : "None."}>{refunds.map((p, i) => <tr key={i}><Td>{p.order_number}</Td><Td>{p.suborder_number}</Td><Td>{formatINR(p.amount_paise)}</Td><Td><Badge color={statusColor(p.status)}>{label(p.status)}</Badge></Td><Td>{new Date(p.created_at).toLocaleString("en-IN")}</Td></tr>)}</Table>
    </>
  );
}
