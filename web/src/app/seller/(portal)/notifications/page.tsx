import { requireSeller } from "@/lib/server/auth";
import { NotificationsView } from "@/components/dashboard/notifications-view";

export const metadata = { title: "Notifications" };
export default async function SellerNotifications() {
  const u = await requireSeller();
  return <NotificationsView userId={u.id} back="/seller/notifications" />;
}
