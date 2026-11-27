import { requireAdmin } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { ticketAction } from "@/app/actions/admin";
import { Badge, btn2, btnSm, card, label, PageTitle, statusColor } from "@/components/ui";

export const metadata = { title: "Support" };

export default async function AdminSupport() {
  await requireAdmin("customers");
  const rows = await q<{ id: string; subject: string; body: string; status: string; created_at: string; email: string; order_number: string | null }>(
    `select t.id, t.subject, t.body, t.status, t.created_at, u.email, po.order_number from support_tickets t join users u on u.id = t.user_id left join parent_orders po on po.id = t.parent_order_id
     order by (t.status in ('open','pending')) desc, t.created_at desc limit 100`);
  return (
    <>
      <PageTitle title="Support requests" />
      {rows.length === 0 ? <p className="text-sm text-muted">No requests.</p> : <ul className="space-y-3">{rows.map((t) => <li key={t.id} className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{t.subject}</p><Badge color={statusColor(t.status)}>{label(t.status)}</Badge></div>
        <p className="text-xs text-muted">{t.email}{t.order_number ? ` · ${t.order_number}` : ""} · {new Date(t.created_at).toLocaleString("en-IN")}</p><p className="mt-2 whitespace-pre-wrap text-sm">{t.body}</p>
        <div className="mt-3 flex gap-2">{["pending", "resolved", "closed"].filter((s) => s !== t.status).map((s) => <form key={s} action={ticketAction}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value={s} /><button className={`${btn2} ${btnSm}`}>Mark {s}</button></form>)}</div></li>)}</ul>}
    </>
  );
}
