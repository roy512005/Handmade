import { requireAdmin } from "@/lib/server/auth";
import { NotificationsView } from "@/components/dashboard/notifications-view";

export const metadata = { title: "Notifications" };
export default async function AdminNotifications() {
  const u = await requireAdmin();
  return <NotificationsView userId={u.id} back="/admin/notifications" />;
}
