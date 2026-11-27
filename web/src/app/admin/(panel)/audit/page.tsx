import { requireAdmin } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { label, PageTitle, Table, Td } from "@/components/ui";

export const metadata = { title: "Audit log" };

export default async function Audit() {
  await requireAdmin("finance");
  const rows = await q<{ id: string; action: string; target_type: string; actor: string | null; after: unknown; created_at: string }>(
    "select a.id, a.action, a.target_type, u.email actor, a.after, a.created_at from audit_logs a left join users u on u.id = a.actor_id order by a.created_at desc limit 200");
  return (<><PageTitle title="Audit log" sub="Refunds, settlements, approvals, suspensions and settings changes." />
    <Table head={["When", "Who", "Action", "Target", "Details"]} empty={rows.length ? undefined : "Nothing recorded yet."}>{rows.map((r) => <tr key={r.id}><Td>{new Date(r.created_at).toLocaleString("en-IN")}</Td><Td>{r.actor}</Td><Td>{label(r.action)}</Td><Td>{r.target_type}</Td><Td className="max-w-xs break-words font-mono text-xs">{r.after ? JSON.stringify(r.after) : ""}</Td></tr>)}</Table></>);
}
