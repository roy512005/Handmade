import { requireAdmin } from "@/lib/server/auth";
import { adminReports } from "@/lib/server/admin";
import { formatINR } from "@/lib/money";
import { PageTitle, Stat, Table, Td } from "@/components/ui";

export const metadata = { title: "Reports" };
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

export default async function Reports() {
  await requireAdmin("reports");
  const { daily, kpi, byCat, bySeller } = await adminReports();
  return (
    <>
      <PageTitle title="Reports" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5"><Stat label="Average order value" value={formatINR(Math.round(kpi.aov))} /><Stat label="Cancellation rate" value={pct(kpi.cancelled, kpi.total)} /><Stat label="Return rate" value={pct(kpi.returned, kpi.total)} /><Stat label="Refund value" value={formatINR(kpi.refunded)} /><Stat label="Repeat customers" value={pct(kpi.repeat, kpi.buyers)} /></div>
      <h2 className="mb-3 mt-8 text-2xl">Daily sales (30 days)</h2>
      <Table head={["Day", "Suborders", "GMV"]} empty={daily.length ? undefined : "No sales yet."}>{daily.map((d) => <tr key={d.day}><Td>{d.day}</Td><Td>{d.orders}</Td><Td>{formatINR(d.gmv)}</Td></tr>)}</Table>
      <h2 className="mb-3 mt-8 text-2xl">Orders by category</h2>
      <Table head={["Category", "Orders", "GMV"]} empty={byCat.length ? undefined : "No sales yet."}>{byCat.map((c) => <tr key={c.name}><Td>{c.name}</Td><Td>{c.n}</Td><Td>{formatINR(c.total)}</Td></tr>)}</Table>
      <h2 className="mb-3 mt-8 text-2xl">Seller performance</h2>
      <Table head={["Seller", "Orders", "GMV", "Delivered", "Rejected by seller"]}>{bySeller.map((s) => <tr key={s.brand_name}><Td>{s.brand_name}</Td><Td>{s.orders}</Td><Td>{formatINR(s.gmv)}</Td><Td>{s.delivered}</Td><Td>{s.cancelled}</Td></tr>)}</Table>
    </>
  );
}
