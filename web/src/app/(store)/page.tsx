/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { cookies } from "next/headers";
import { getCollections, listProducts, listSellers, productsByIds } from "@/lib/server/catalog";
import { getUser } from "@/lib/server/auth";
import { wishlistIds } from "@/lib/server/wishlist";
import { subscribeNewsletter } from "@/app/actions/auth";
import { formatINR } from "@/lib/money";
import { MOODS } from "@/lib/art";
import { Masonry, ProductCard } from "@/components/storefront/product-card";
import { Flash } from "@/components/ui";

const kicker = "text-xs font-semibold uppercase tracking-[0.18em] text-terracotta";
const wrap = "mx-auto max-w-[1400px] px-4 md:px-8";

function Head({ k, title, href, link = "See all" }: { k: string; title: string; href?: string; link?: string }) {
  return (
    <div className="mb-8 flex items-end justify-between gap-6">
      <div><p className={kicker}>{k}</p><h2 className="mt-2 text-4xl leading-tight md:text-5xl">{title}</h2></div>
      {href && <Link href={href} className="hidden shrink-0 border-b border-charcoal pb-0.5 text-xs font-semibold uppercase tracking-[0.14em] hover:border-terracotta hover:text-terracotta sm:block">{link}</Link>}
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ err?: string; msg?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  const rvCookie = (await cookies()).get("rv")?.value ?? "";
  const [hero, discoveries, oneOff, makers, fresh, collections, viewed, wished] = await Promise.all([
    listProducts({ featured: true, sort: "daily", pageSize: 3 }),
    listProducts({ sort: "daily", pageSize: 10 }),
    listProducts({ oneOfAKind: true, sort: "newest", pageSize: 4 }),
    listSellers(),
    listProducts({ isNew: true, sort: "newest", pageSize: 8 }),
    getCollections(),
    productsByIds(decodeURIComponent(rvCookie).split(",").slice(0, 8)),
    wishlistIds(user?.id),
  ]);
  const drop = collections.find((c) => c.kind === "drop");
  const curated = collections.filter((c) => c.kind !== "drop");
  const h = hero.rows;

  return (
    <>
      {/* B. Hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className={`${wrap} grid items-center gap-10 py-10 md:py-16 lg:grid-cols-12`}>
          <div className="lg:col-span-5">
            <p className={kicker}>Made by hand · Made in India</p>
            <h1 className="mt-4 text-[44px] leading-[1.02] md:text-7xl">Things made by hand, with a story to tell.</h1>
            <p className="mt-6 max-w-md font-product text-lg leading-relaxed text-muted">Wander through one-of-a-kind pieces from independent artisans across India — and meet the people behind them.</p>
            <div className="mt-8 flex flex-wrap gap-3 font-product">
              <Link href="/discover" className="bg-forest px-7 py-3.5 text-sm font-medium uppercase tracking-[0.1em] text-white transition hover:bg-forest/90">Explore the collection</Link>
              <Link href="/stories" className="border border-forest px-7 py-3.5 text-sm font-medium uppercase tracking-[0.1em] text-forest transition hover:bg-forest/5">Meet the artisans</Link>
            </div>
          </div>
          <div className="relative lg:col-span-7">
            <div className="grid grid-cols-12 items-start gap-3 md:gap-5">
              {h[0] && <HeroTile p={h[0]} className="col-span-7" ratio="4 / 5" />}
              <div className="col-span-5 space-y-3 pt-10 md:space-y-5 md:pt-20">
                {h[1] && <HeroTile p={h[1]} ratio="1 / 1" />}
                {h[2] && <HeroTile p={h[2]} ratio="4 / 5" />}
              </div>
            </div>
          </div>
        </div>
        {(sp.err || sp.msg) && <div className={`${wrap} pb-6`}><Flash err={sp.err} msg={sp.msg} /></div>}
      </section>

      {/* C. Explore by mood */}
      <section className={`${wrap} pt-20`}>
        <Head k="Explore by mood" title="What are you in the mood for?" href="/discover" link="Browse all" />
        <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:gap-6 md:overflow-visible md:px-0">
          {MOODS.map((m, i) => (
            <li key={m.key} className={`w-44 shrink-0 md:w-auto ${i % 2 ? "md:mt-10" : ""}`}>
              <Link href={`/discover?mood=${m.key}`} className="group block">
                <div className="aspect-[3/4] overflow-hidden bg-sand"><img src={`/art/palette-${m.key}.svg?m=${m.key}&a=portrait`} alt="" loading="lazy" decoding="async" width={800} height={1000} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
                <p className="mt-3 font-serif text-2xl">{m.label}</p><p className="font-product text-sm text-muted">{m.blurb}</p>
              </Link>
            </li>))}
        </ul>
      </section>

      {/* D. Today's Discoveries */}
      <section className={`${wrap} pt-24`}>
        <Head k="Today's discoveries" title="Fresh finds, picked for today" href="/discover" link="Keep exploring" />
        <Masonry>{discoveries.rows.map((p, i) => <ProductCard key={p.id} product={p} wished={wished.has(p.id)} index={i} />)}</Masonry>
        <div className="mt-2 text-center sm:hidden"><Link href="/discover" className="border-b border-charcoal pb-0.5 text-xs font-semibold uppercase tracking-[0.14em]">Keep exploring</Link></div>
      </section>

      {/* E. One-of-a-kind finds */}
      {oneOff.rows.length > 0 && (
        <section className="mt-24 bg-sand/60 py-20">
          <div className={wrap}>
            <Head k="One of a kind" title="Only one of each exists" href="/discover?one=1" />
            <p className="-mt-4 mb-10 max-w-xl font-product text-muted">These pieces were made once and won&apos;t be made again. When they&apos;re gone, they&apos;re gone — not as a countdown, just as a fact.</p>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {oneOff.rows.map((p, i) => (
                <Link key={p.id} href={`/products/${p.id}`} className="reveal group block" style={{ ["--i" as string]: i }}>
                  <div className="aspect-[4/5] overflow-hidden bg-white"><img src={p.image_url ?? ""} alt={p.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta">One of a kind · {p.brand_name}</p>
                  <p className="font-serif text-xl leading-snug">{p.title}</p><p className="font-product text-sm">{formatINR(p.price_paise)}</p>
                </Link>))}
            </div>
          </div>
        </section>)}

      {/* F. Meet the makers */}
      <section className={`${wrap} pt-24`}>
        <Head k="Meet the makers" title="The hands behind the work" href="/stories" link="All artisan stories" />
        <div className="grid gap-8 md:grid-cols-12">
          {makers.slice(0, 4).map((m, i) => (
            <Link key={m.id} href={`/makers/${m.slug}`} className={`group reveal block ${i === 0 ? "md:col-span-6 md:row-span-2" : "md:col-span-3"}`} style={{ ["--i" as string]: i }}>
              <div className={`${i === 0 ? "aspect-[4/5]" : "aspect-[3/4]"} overflow-hidden bg-sand`}><img src={m.cover ?? m.profile_image_url ?? ""} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-terracotta">{m.location} · {m.craft}</p>
              <p className={`font-serif leading-tight ${i === 0 ? "text-4xl" : "text-2xl"}`}>{m.brand_name}</p>
              <p className="mt-1 line-clamp-3 font-product text-sm text-muted">{i === 0 ? m.story : m.tagline}</p>
              <p className="mt-2 border-b border-charcoal/40 pb-0.5 font-product text-xs font-semibold uppercase tracking-[0.12em] inline-block group-hover:border-terracotta group-hover:text-terracotta">Explore their creations →</p>
            </Link>))}
        </div>
      </section>

      {/* G. Freshly added */}
      {fresh.rows.length > 0 && (
        <section className={`${wrap} pt-24`}>
          <Head k="Freshly added" title="Just landed from the workshop" href="/discover?sort=newest&new=1" />
          <Masonry>{fresh.rows.map((p, i) => <ProductCard key={p.id} product={p} wished={wished.has(p.id)} index={i} />)}</Masonry>
        </section>)}

      {/* H. Curated collections (+ the weekly drop) */}
      <section className={`${wrap} pt-24`}>
        <Head k="Curated collections" title="Ways to shop, by the way you live" href="/collections" />
        {drop && (
          <Link href={`/collections/${drop.slug}`} className="group mb-8 grid overflow-hidden bg-forest text-ivory md:grid-cols-2">
            <div className="flex flex-col justify-center p-8 md:p-14"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">The weekly drop</p>
              <h3 className="mt-3 font-serif text-4xl leading-tight">{drop.title}</h3><p className="mt-3 max-w-sm font-product text-ivory/75">{drop.description}</p>
              <p className="mt-6 inline-block border-b border-gold pb-0.5 font-product text-xs font-semibold uppercase tracking-[0.14em] text-gold">See the drop ({drop.n} pieces)</p></div>
            <div className="aspect-[16/10] overflow-hidden md:aspect-auto">{drop.cover && <img src={drop.cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}</div>
          </Link>)}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          {curated.filter((c) => c.slug !== "gifts-under-999").map((c, i) => (
            <Link key={c.slug} href={`/collections/${c.slug}`} className="group reveal relative block overflow-hidden bg-sand" style={{ ["--i" as string]: i }}>
              <div className={i % 3 === 1 ? "aspect-[4/5]" : "aspect-square"}>{c.cover && <img src={c.cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}</div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-14 text-white"><p className="font-serif text-xl md:text-2xl">{c.title}</p><p className="font-product text-xs text-white/80">{c.n} pieces</p></div>
            </Link>))}
          {[["Under ₹499", "/discover?max=499&sort=price-asc"], ["Under ₹999", "/discover?max=999&sort=price-asc"]].map(([t, h2]) => (
            <Link key={t} href={h2} className="flex aspect-square items-center justify-center border border-forest bg-transparent p-4 text-center transition hover:bg-forest hover:text-white"><span className="font-serif text-3xl">{t}</span></Link>))}
        </div>
      </section>

      {/* I. Recently viewed */}
      {viewed.length > 0 && (
        <section className={`${wrap} pt-24`}>
          <Head k="Recently viewed" title="Pick up where you left off" />
          <ul className="-mx-4 flex gap-5 overflow-x-auto px-4 pb-3 md:mx-0 md:px-0">
            {viewed.map((p) => (
              <li key={p.id} className="w-40 shrink-0 md:w-52"><Link href={`/products/${p.id}`} className="group block">
                <div className="aspect-[4/5] overflow-hidden bg-sand"><img src={p.image_url ?? ""} alt={p.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
                <p className="mt-2 line-clamp-1 font-serif text-base">{p.title}</p><p className="font-product text-sm text-muted">{formatINR(p.price_paise)}</p></Link></li>))}
          </ul>
        </section>)}

      {/* Newsletter */}
      <section className={`${wrap} pt-24`}>
        <form action={subscribeNewsletter} className="border border-forest p-8 md:flex md:items-center md:justify-between md:gap-10 md:p-12">
          <div><p className={kicker}>Once a fortnight</p><h2 className="mt-2 text-3xl md:text-4xl">Stories from the workshop</h2>
            <p className="mt-2 max-w-md font-product text-sm text-muted">New makers, new drops and a little of how things are made. Unsubscribe any time.</p></div>
          <div className="mt-6 flex w-full max-w-md gap-0 font-product md:mt-0"><label htmlFor="nl" className="sr-only">Email address</label>
            <input id="nl" name="email" type="email" required placeholder="you@example.com" className="w-full border border-r-0 border-forest bg-transparent px-4 py-3 text-sm placeholder:text-muted" />
            <button className="bg-forest px-6 text-sm font-medium uppercase tracking-[0.1em] text-white">Subscribe</button></div>
        </form>
      </section>
    </>
  );
}

function HeroTile({ p, className = "", ratio }: { p: Awaited<ReturnType<typeof listProducts>>["rows"][number]; className?: string; ratio: string }) {
  return (
    <Link href={`/products/${p.id}`} className={`group reveal block ${className}`}>
      <div className="overflow-hidden bg-sand" style={{ aspectRatio: ratio }}><img src={p.image_url ?? ""} alt={p.title} width={p.img_w ?? 800} height={p.img_h ?? 1000} decoding="async" fetchPriority="high" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /></div>
      <p className="mt-2 font-product text-xs text-muted"><span className="font-serif text-sm text-charcoal">{p.title}</span> · {p.brand_name}</p>
    </Link>
  );
}
