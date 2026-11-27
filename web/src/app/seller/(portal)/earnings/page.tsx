import { requireSeller } from "@/lib/server/auth";
import { listSettlements, releaseDueLedger, sellerBalances, sellerLedger } from "@/lib/server/ledger";
import { q } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { Badge, label, PageTitle, Stat, statusColor, Table, Td } from "@/components/ui";

export const metadata = { title: "Earnings" };

export default async function Earnings() {
  const u = await requireSeller();
  await releaseDueLedger();
  const [b, ledger, settlements, breakdown] = await Promise.all([sellerBalances(u.sellerId), sellerLedger(u.sellerId), listSettlements(u.sellerId),
    q<{ suborder_number: string; base_paise: number; rate_bps: number; amount_paise: number; status: string; created_at: string }>(
      `select so.suborder_number, c.base_paise, c.rate_bps, c.amount_paise, so.status, so.created_at from commissions c join seller_suborders so on so.id = c.suborder_id
       where so.seller_id = $1 order by so.created_at desc limit 50`, [u.sellerId])]);
  return (
    <>
      <PageTitle title="Earnings" sub="Settlements are paid after delivery and the return window." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Gross product sales" value={formatINR(b.gross)} /><Stat label="Platform commission" value={formatINR(b.commission)} /><Stat label="Refund deductions" value={formatINR(b.refunds)} />
        <Stat label="Net earnings" value={formatINR(b.pending + b.available + b.settled)} />
        <Stat label="Pending" value={formatINR(b.pending)} /><Stat label="Available for payout" value={formatINR(b.available)} /><Stat label="Paid out" value={formatINR(b.settled)} />
      </div>
      <h2 className="mb-3 mt-8 text-2xl">Commission breakdown</h2>
      <Table head={["Order", "Item total", "Rate", "Commission", "You receive", "Status"]} empty={breakdown.length ? undefined : "No orders yet."}>
        {breakdown.map((c) => <tr key={c.suborder_number}><Td>{c.suborder_number}</Td><Td>{formatINR(c.base_paise)}</Td><Td>{c.rate_bps / 100}%</Td><Td>− {formatINR(c.amount_paise)}</Td><Td className="font-medium">{formatINR(c.base_paise - c.amount_paise)}</Td><Td><Badge color={statusColor(c.status)}>{label(c.status)}</Badge></Td></tr>)}</Table>
      <p className="mt-2 text-xs text-muted">Refunded orders are reversed in the ledger below.</p>
      <h2 className="mb-3 mt-8 text-2xl">Settlement history</h2>
      <Table head={["Date", "Amount", "Status"]} empty={settlements.length ? undefined : "No settlements yet."}>{settlements.map((s) => <tr key={s.id}><Td>{new Date(s.created_at).toLocaleDateString("en-IN")}</Td><Td>{formatINR(s.amount_paise)}</Td><Td><Badge color={statusColor(s.status)}>{label(s.status)}</Badge></Td></tr>)}</Table>
      <h2 className="mb-3 mt-8 text-2xl">Ledger</h2>
      <Table head={["Date", "Order", "Type", "Amount", "Status"]} empty={ledger.length ? undefined : "No transactions yet."}>
        {ledger.map((l) => <tr key={l.id}><Td>{new Date(l.created_at).toLocaleDateString("en-IN")}</Td><Td>{l.suborder_number}</Td><Td>{label(l.entry_type)}</Td><Td className={l.amount_paise < 0 ? "text-error" : ""}>{formatINR(l.amount_paise)}</Td><Td><Badge color={statusColor(l.status)}>{label(l.status)}</Badge></Td></tr>)}</Table>
    </>
  );
}
