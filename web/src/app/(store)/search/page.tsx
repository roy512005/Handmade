import Link from "next/link";
import { ProductListing } from "@/components/storefront/product-listing";
import { suggestions } from "@/lib/server/catalog";
export const metadata = { title: "Search" };
const POPULAR = ["lamp", "silver", "block print", "ceramic", "wooden", "gift"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const term = typeof sp.q === "string" ? sp.q : "";
  const sugg = await suggestions(term);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <h1 className="text-5xl leading-tight">{term ? `Results for “${term}”` : "Search"}</h1>
      <div className="mb-8 mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Popular:</span>{POPULAR.map((p) => <Link key={p} href={`/search?q=${encodeURIComponent(p)}`} className="border border-line px-3 py-1 hover:border-forest">{p}</Link>)}
      </div>
      {sugg.length > 0 && <p className="mb-6 flex flex-wrap gap-3 text-sm"><span className="text-muted">Jump to:</span>{sugg.map((s) => <Link key={s.href} href={s.href} className="text-forest underline">{s.label}</Link>)}</p>}
      <ProductListing searchParams={searchParams} base="/search" showCategories />
    </div>
  );
}
