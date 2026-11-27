import { getUser } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { markNotificationsRead } from "@/app/actions/account";
import { btn2, card, PageTitle } from "@/components/ui";
import { describeNotification } from "@/lib/notificationText";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = (await getUser())!;
  const rows = await q<{ id: string; type: string; payload: Record<string, unknown>; read_at: string | null; created_at: string }>(
    "select id, type, payload, read_at, created_at from notifications where user_id = $1 order by created_at desc limit 50", [user.id]);
  return (
    <>
      <PageTitle title="Notifications" action={rows.some((r) => !r.read_at) && <form action={markNotificationsRead}><button className={btn2}>Mark all read</button></form>} />
      {rows.length === 0 ? <p className="text-sm text-muted">You&apos;re all caught up.</p> : (
        <ul className="space-y-2">{rows.map((n) => <li key={n.id} className={`${card} text-sm ${n.read_at ? "opacity-70" : ""}`}>{describeNotification(n.type, n.payload)}<span className="ml-2 text-xs text-muted">{new Date(n.created_at).toLocaleString("en-IN")}</span></li>)}</ul>)}
    </>
  );
}
