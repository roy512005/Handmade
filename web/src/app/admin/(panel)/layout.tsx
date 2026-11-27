import { can, requireAdmin, type Perm } from "@/lib/server/auth";
import { q1 } from "@/lib/server/db";
import { label } from "@/components/ui";
import { DashboardShell } from "@/components/dashboard/shell";
import type { NavGroup, NavItem } from "@/components/dashboard/nav-links";

type Item = NavItem & { perm?: Perm };
const raw: { label?: string; items: Item[] }[] = [
  { items: [{ href: "/admin", label: "Dashboard", icon: "dashboard", exact: true }] },
  { label: "Marketplace", items: [{ href: "/admin/sellers", label: "Sellers", icon: "store", perm: "sellers" }, { href: "/admin/products", label: "Products", icon: "box", perm: "products" }] },
  { label: "Order management", items: [{ href: "/admin/orders", label: "Orders", icon: "cart", perm: "orders" }] },
  { label: "User management", items: [{ href: "/admin/customers", label: "Customers", icon: "users", perm: "customers" }, { href: "/admin/support", label: "Support", icon: "help", perm: "customers" }] },
  { label: "Finance management", items: [{ href: "/admin/finance", label: "Finance & settlements", icon: "wallet", perm: "finance" }, { href: "/admin/coupons", label: "Coupons", icon: "tag", perm: "coupons" }] },
  { label: "Reports & analytics", items: [{ href: "/admin/reports", label: "Reports", icon: "chart", perm: "reports" }, { href: "/admin/audit", label: "Audit log", icon: "log", perm: "finance" }] },
  { label: "Site", items: [{ href: "/admin/content", label: "Content & settings", icon: "settings", perm: "content" }, { href: "/admin/notifications", label: "Notifications", icon: "bell" }] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  const groups: NavGroup[] = raw.map((g) => ({ label: g.label, items: g.items.filter((i) => !i.perm || can(user, i.perm)) })).filter((g) => g.items.length);
  const unread = (await q1<{ n: number }>("select count(*)::int n from notifications where user_id = $1 and read_at is null", [user.id]))!.n;
  const roles = user.roles.filter((r) => r !== "buyer").map(label).join(", ");
  return (
    <DashboardShell brand="Handmade marketplace" role="Admin" groups={groups} userName={user.name ?? "Admin"} userSub={roles}
      unread={unread} notificationsHref="/admin/notifications" searchAction="/admin/orders" searchPlaceholder="Search orders, buyers…">
      {children}
    </DashboardShell>
  );
}
