import { can, getUser } from "@/lib/server/auth";
import { q } from "@/lib/server/db";

const esc = (v: unknown) => { const s = String(v ?? ""); return /^[=+\-@]/.test(s) ? `'${s}` : s; }; // neutralise CSV formula injection
const csv = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => `"${esc(r[c]).replace(/"/g, '""')}"`).join(","))].join("\n");
};

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getUser();
  if (!user?.isAdmin || !can(user, "finance")) return new Response("Forbidden", { status: 403 });
  const kind = (await params).kind;
  const rows = kind === "transactions"
    ? await q("select po.order_number, p.provider_payment_id, p.amount_paise, p.status, p.created_at from payments p join parent_orders po on po.id = p.parent_order_id order by p.created_at desc")
    : kind === "ledger"
      ? await q("select s.brand_name, so.suborder_number, e.entry_type, e.amount_paise, e.status, e.created_at from seller_ledger_entries e join seller_profiles s on s.id = e.seller_id left join seller_suborders so on so.id = e.suborder_id order by e.created_at desc")
      : null;
  if (!rows) return new Response("Not found", { status: 404 });
  return new Response(csv(rows as Record<string, unknown>[]), { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="${kind}.csv"` } });
}
