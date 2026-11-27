"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icons";

export type NavItem = { href: string; label: string; icon: string; exact?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  const path = usePathname();
  const active = (i: NavItem) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/"));
  return (
    <nav aria-label="Dashboard" className="space-y-5 px-3 pb-6">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} aria-current={active(i) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm transition ${active(i) ? "bg-[#111411] font-medium text-white" : "text-charcoal/80 hover:bg-sand/70"}`}>
                  <Icon name={i.icon} className={`h-[18px] w-[18px] shrink-0 ${active(i) ? "text-lime" : ""}`} />{i.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
