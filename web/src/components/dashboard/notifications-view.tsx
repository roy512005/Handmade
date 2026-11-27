import { q } from "@/lib/server/db";
import { markNotificationsRead } from "@/app/actions/account";
import { describeNotification } from "@/lib/notificationText";
import { btn2, PageTitle } from "@/components/ui";

export async function NotificationsView({ userId, back }: { userId: string; back: string }) {
  const rows = await q<{ id: string; type: string; payload: Record<string, unknown>; read_at: string | null; created_at: string }>(
    "select id, type, payload, read_at, created_at from notifications where user_id = $1 order by created_at desc limit 100", [userId]);
  return (
    <>
      <PageTitle title="Notifications" action={rows.some((r) => !r.read_at) && <form action={markNotificationsRead}><input type="hidden" name="back" value={back} /><button className={btn2}>Mark all read</button></form>} />
      {rows.length === 0 ? <p className="text-sm text-muted">You&apos;re all caught up.</p> : (
        <ul className="divide-y divide-line rounded-card border border-line">{rows.map((n) => (
          <li key={n.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm ${n.read_at ? "text-muted" : "font-medium"}`}>
            <span>{!n.read_at && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-terracotta" aria-label="Unread" />}{describeNotification(n.type, n.payload)}</span>
            <span className="text-xs font-normal text-muted">{new Date(n.created_at).toLocaleString("en-IN")}</span></li>))}</ul>)}
    </>
  );
}
