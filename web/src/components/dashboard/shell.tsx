import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Icon } from "./icons";
import { NavLinks, type NavGroup } from "./nav-links";

/** Sidebar + top bar + white content panel shared by the seller and admin dashboards. */
export function DashboardShell({
  brand, role, groups, userName, userSub, unread, notificationsHref, searchAction, searchPlaceholder, banner, children,
}: {
  brand: string; role: string; groups: NavGroup[]; userName: string; userSub: string; unread: number;
  notificationsHref: string; searchAction: string; searchPlaceholder: string; banner?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="dash-theme min-h-screen bg-ivory text-charcoal">
      <input type="checkbox" id="dash-nav" className="peer sr-only" aria-label="Toggle menu" />
      <aside className="fixed inset-y-0 left-0 z-50 w-64 -translate-x-full overflow-y-auto border-r border-dashed border-line bg-surface text-charcoal transition-transform peer-checked:translate-x-0 lg:translate-x-0">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime text-lg font-bold text-[#111411]">H</span>
          <div className="leading-tight"><p className="text-xl font-semibold tracking-tight">Handmade</p><p className="text-[11px] uppercase tracking-wider text-muted">{role}</p></div>
        </div>
        <NavLinks groups={groups} />
        <div className="border-t border-dashed border-line px-6 py-4 text-sm">
          <p className="truncate font-medium">{brand}</p>
          <div className="mt-2 flex gap-4 text-muted"><Link href="/" className="hover:text-forest">View store</Link>
            <form action={logout}><button className="hover:text-forest">Sign out</button></form></div>
        </div>
      </aside>
      <label htmlFor="dash-nav" className="fixed inset-0 z-40 hidden bg-black/40 peer-checked:block lg:!hidden" aria-hidden="true" />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-ivory/90 px-4 py-4 backdrop-blur sm:px-6">
          <label htmlFor="dash-nav" className="cursor-pointer rounded-full bg-surface p-2.5 shadow-sm lg:hidden" aria-label="Open menu"><Icon name="menu" /></label>
          <form action={searchAction} role="search" className="relative max-w-md flex-1">
            <label htmlFor="dash-q" className="sr-only">Search</label>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" className="h-4 w-4" /></span>
            <input id="dash-q" name="q" type="search" placeholder={searchPlaceholder} className="w-full rounded-full border border-line bg-surface py-2.5 pl-10 pr-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] text-sm placeholder:text-muted" />
          </form>
          <div className="ml-auto flex items-center gap-4">
            <Link href={notificationsHref} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface text-charcoal shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-sand/70" aria-label={`Notifications, ${unread} unread`}>
              <Icon name="bell" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[10px] font-semibold text-white">{unread > 99 ? "99+" : unread}</span>}
            </Link>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#111411] font-semibold text-lime">{userName.slice(0, 1).toUpperCase()}</span>
              <div className="text-xs leading-tight"><p className="font-medium text-sm">{userName}</p><p className="text-muted">{userSub}</p></div>
            </div>
          </div>
        </header>
        <main className="px-4 pb-10 pt-2 sm:px-6">
          {banner}
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
