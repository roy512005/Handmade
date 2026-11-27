import Link from "next/link";
import { requireUser } from "@/lib/server/auth";
import { q1 } from "@/lib/server/db";

const links = [["/account", "Overview"], ["/account/orders", "My orders"], ["/account/wishlist", "Wishlist"], ["/account/boards", "Moodboards"], ["/account/following", "Following"], ["/account/addresses", "Addresses"], ["/account/notifications", "Notifications"], ["/account/preferences", "Preferences"], ["/account/profile", "Profile"], ["/account/support", "Help & support"]];

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/account");
  const n = (await q1<{ n: number }>("select count(*)::int n from notifications where user_id = $1 and read_at is null", [user.id]))!.n;
  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[200px_1fr]">
      <nav aria-label="Account" className="flex gap-4 overflow-x-auto text-sm md:flex-col md:gap-1">
        {links.map(([href, l]) => <Link key={href} href={href} className="whitespace-nowrap rounded-control px-3 py-2 hover:bg-sand/60">{l}{href.endsWith("notifications") && n > 0 && <span className="ml-2 rounded-full bg-terracotta px-2 text-xs text-white">{n}</span>}</Link>)}
      </nav>
      <div>{children}</div>
    </div>
  );
}
