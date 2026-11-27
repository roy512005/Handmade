import Link from "next/link";
import { requireSeller } from "@/lib/server/auth";
import { q1 } from "@/lib/server/db";
import { label } from "@/components/ui";
import { DashboardShell } from "@/components/dashboard/shell";
import type { NavGroup } from "@/components/dashboard/nav-links";

const groups: NavGroup[] = [
  { items: [{ href: "/seller", label: "Dashboard", icon: "dashboard", exact: true }] },
  { label: "Product management", items: [{ href: "/seller/products", label: "My products", icon: "box" }] },
  { label: "Order management", items: [{ href: "/seller/orders", label: "Orders", icon: "cart" }, { href: "/seller/reviews", label: "Customer reviews", icon: "check" }] },
  { label: "Finance", items: [{ href: "/seller/earnings", label: "Earnings & settlements", icon: "wallet" }] },
  { label: "Account", items: [{ href: "/seller/profile", label: "Profile & documents", icon: "store" }, { href: "/seller/notifications", label: "Notifications", icon: "bell" }] },
];

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSeller();
  const row = await q1<{ brand_name: string; rejection_reason: string | null }>("select brand_name, rejection_reason from seller_profiles where id = $1", [user.sellerId]);
  const unread = (await q1<{ n: number }>("select count(*)::int n from notifications where user_id = $1 and read_at is null", [user.id]))!.n;
  const approved = user.sellerStatus === "approved";
  return (
    <DashboardShell brand={row?.brand_name ?? ""} role="Seller" groups={groups} userName={user.name ?? row?.brand_name ?? "Seller"} userSub={`Seller · ${label(user.sellerStatus ?? "")}`}
      unread={unread} notificationsHref="/seller/notifications" searchAction="/seller/products" searchPlaceholder="Search your products…"
      banner={!approved && (
        <div role="status" className="mb-4 rounded-card border border-line bg-surface p-4 text-sm">
          {user.sellerStatus === "rejected" ? <>Your application wasn&apos;t approved. {row?.rejection_reason}</> :
            user.sellerStatus === "suspended" ? <>Your account is suspended. Please contact support.</> :
              <>Your application is <b>{label(user.sellerStatus ?? "pending").toLowerCase()}</b>. Upload your documents under <Link href="/seller/profile" className="text-forest underline">Profile &amp; documents</Link>. You can list products once we approve you.</>}
        </div>)}>
      {children}
    </DashboardShell>
  );
}

