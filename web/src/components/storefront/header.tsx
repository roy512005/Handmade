import Link from "next/link";
import { getUser } from "@/lib/server/auth";
import { cartCount } from "@/lib/server/cart";
import { Icon } from "@/components/dashboard/icons";

const nav = [
  { href: "/discover", label: "Discover" },
  { href: "/categories", label: "Categories" },
  { href: "/discover?sort=newest&new=1", label: "New Arrivals" },
  { href: "/stories", label: "Artisan Stories" },
];

export async function Header() {
  const [user, count] = await Promise.all([getUser(), cartCount()]);
  const icon = "relative flex h-10 w-10 items-center justify-center rounded-full text-charcoal transition hover:bg-sand";
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-4 md:px-8 lg:gap-10">
          <Link href="/" className="font-serif text-[26px] leading-none tracking-tight text-forest">Handmade</Link>
          <nav aria-label="Main" className="hidden gap-8 text-[12px] font-medium uppercase tracking-[0.14em] lg:flex">
            {nav.map((n) => <Link key={n.href} href={n.href} className="border-b border-transparent pb-0.5 transition hover:border-forest hover:text-forest">{n.label}</Link>)}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <form action="/search" role="search" className="mr-2 hidden items-center border-b border-charcoal/30 transition focus-within:border-forest md:flex">
              <label htmlFor="q" className="sr-only">Search handmade products and makers</label>
              <Icon name="search" className="h-4 w-4 text-muted" />
              <input id="q" name="q" type="search" placeholder="Search" autoComplete="off" className="w-28 bg-transparent px-2 py-2 text-sm placeholder:text-muted focus:outline-none focus:w-56 transition-all" />
            </form>
            <Link href="/search" className={`${icon} md:hidden`} aria-label="Search"><Icon name="search" /></Link>
            <Link href="/account/wishlist" className={`${icon} hidden md:flex`} aria-label="Wishlist"><Icon name="heart" /></Link>
            <Link href={user ? "/account" : "/login"} className={`${icon} hidden md:flex`} aria-label={user ? "Account" : "Sign in"}><Icon name="user" /></Link>
            <Link href="/cart" className={icon} aria-label={`Shopping bag, ${count} items`}><Icon name="bag" />{count > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-semibold text-white">{count}</span>}</Link>
            {user?.sellerId && <Link href="/seller" className="ml-2 hidden text-xs uppercase tracking-[0.12em] text-muted hover:text-forest xl:block">Seller</Link>}
            {user?.isAdmin && <Link href="/admin" className="ml-2 hidden text-xs uppercase tracking-[0.12em] text-muted hover:text-forest xl:block">Admin</Link>}
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {[["/", "Home", "home"], ["/discover", "Discover", "compass"], ["/account/wishlist", "Saved", "heart"], ["/cart", "Bag", "bag"], [user ? "/account" : "/login", user ? "Account" : "Sign in", "user"]].map(([href, label, ic]) => (
          <Link key={label} href={href} className="relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] text-charcoal active:bg-sand">
            <Icon name={ic} className="h-[22px] w-[22px]" />{label}
            {label === "Bag" && count > 0 && <span className="absolute right-[28%] top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta px-1 text-[10px] font-semibold text-white">{count}</span>}
          </Link>))}
      </nav>
    </>
  );
}
