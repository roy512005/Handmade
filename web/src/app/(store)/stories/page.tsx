/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { listSellers } from "@/lib/server/catalog";
import { getUser } from "@/lib/server/auth";
import { followedIds } from "@/lib/server/social";
import { FollowButton } from "@/components/storefront/follow-button";

export const metadata = { title: "Artisan Stories" };

export default async function Stories() {
  const [makers, user] = await Promise.all([listSellers(), getUser()]);
  const followed = await followedIds(user?.id);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <header className="mb-16 max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Artisan stories</p>
        <h1 className="mt-3 text-5xl leading-[1.05] md:text-7xl">The people behind every piece</h1>
        <p className="mt-5 font-product text-lg text-muted">Every maker here is reviewed before they sell. These are their stories, in their words.</p></header>
      <div className="space-y-20 md:space-y-28">
        {makers.map((m, i) => (
          <article key={m.id} className={`grid items-center gap-8 md:gap-16 lg:grid-cols-12 ${i % 2 ? "" : ""}`}>
            <Link href={`/makers/${m.slug}`} className={`group block lg:col-span-5 ${i % 2 ? "lg:order-2 lg:col-start-8" : ""}`}>
              <div className="aspect-[4/5] overflow-hidden bg-sand"><img src={m.cover ?? m.profile_image_url ?? ""} alt="" loading={i < 2 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div></Link>
            <div className={`lg:col-span-6 ${i % 2 ? "lg:order-1" : "lg:col-start-7"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">{m.location} · {m.craft}</p>
              <h2 className="mt-3 text-4xl leading-tight md:text-5xl">{m.brand_name}</h2>
              {m.tagline && <p className="mt-3 font-serif text-xl italic text-forest">“{m.tagline}”</p>}
              <p className="mt-5 font-product leading-relaxed text-muted">{m.story}</p>
              <div className="mt-7 flex flex-wrap items-center gap-6 font-product"><Link href={`/makers/${m.slug}`} className="border-b border-charcoal pb-0.5 text-xs font-semibold uppercase tracking-[0.14em] hover:border-terracotta hover:text-terracotta">See {m.n} {m.n === 1 ? "creation" : "creations"} →</Link>
                <FollowButton sellerId={m.id} initial={followed.has(m.id)} size="sm" /></div>
            </div>
          </article>))}
      </div>
    </div>
  );
}
