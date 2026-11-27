/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getCollections } from "@/lib/server/catalog";

export const metadata = { title: "Collections" };

export default async function Collections() {
  const cols = await getCollections();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <header className="mb-12 max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Curated by us</p><h1 className="mt-3 text-5xl leading-tight md:text-6xl">Collections</h1>
        <p className="mt-4 font-product text-muted">Small, hand-picked edits — including a new drop each week.</p></header>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cols.map((c, i) => (
          <Link key={c.slug} href={`/collections/${c.slug}`} className="group reveal block" style={{ ["--i" as string]: i }}>
            <div className="aspect-[4/5] overflow-hidden bg-sand">{c.cover && <img src={c.cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}</div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta">{c.kind === "drop" ? "Weekly drop" : `${c.n} pieces`}</p>
            <h2 className="font-serif text-2xl">{c.title}</h2><p className="font-product text-sm text-muted">{c.description}</p></Link>))}
      </div>
    </div>
  );
}
