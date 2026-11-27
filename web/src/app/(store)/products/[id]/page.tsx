/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, listProducts } from "@/lib/server/catalog";
import { getUser } from "@/lib/server/auth";
import { wishlistIds } from "@/lib/server/wishlist";
import { followedIds, myBoards } from "@/lib/server/social";
import { getSettings } from "@/lib/server/settings";
import { shippingFor } from "@/lib/server/shipping";
import { discountPercent, formatINR } from "@/lib/money";
import { MOODS } from "@/lib/art";
import { addToCartAction } from "@/app/actions/shop";
import { saveToBoardAction } from "@/app/actions/social";
import { Flash, input } from "@/components/ui";
import { Masonry, ProductCard } from "@/components/storefront/product-card";
import { WishButton } from "@/components/storefront/wish-button";
import { FollowButton } from "@/components/storefront/follow-button";
import { TrackView } from "@/components/storefront/track-view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const p = await getProduct((await params).id);
  return { title: p?.title ?? "Product" };
}

const label = "text-[11px] font-semibold uppercase tracking-[0.16em] text-muted";

export default async function ProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string; msg?: string; img?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const p = await getProduct(id);
  if (!p) notFound();
  const user = await getUser();
  const [wished, followed, boards, similar, settings] = await Promise.all([
    wishlistIds(user?.id), followedIds(user?.id), user ? myBoards(user.id) : Promise.resolve([]),
    listProducts({ category: p.category_slug, mood: p.moods[0], exclude: p.id, pageSize: 8, sort: "popular" }), getSettings(),
  ]);
  let more = similar.rows;
  if (more.length < 4) more = [...more, ...(await listProducts({ category: p.category_slug, exclude: p.id, pageSize: 8 })).rows.filter((r) => !more.some((m) => m.id === r.id))];
  more = more.slice(0, 4);

  const off = p.original_price_paise ? discountPercent(p.price_paise, p.original_price_paise) : 0;
  const ship = shippingFor(p.weight_grams ?? 500, p.price_paise, settings);
  const lo = p.processing_days + 3, hi = p.processing_days + 7;
  const inStock = p.variants.some((v) => v.available > 0);
  const url = `/products/${p.id}`;
  const dims = p.length_mm ? `${p.length_mm / 10} × ${p.width_mm! / 10} × ${p.height_mm! / 10} cm` : null;
  const gallery = p.images.length ? p.images : [{ url: "", alt: p.title, width: 800, height: 1000 }];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8 md:py-12">
      <TrackView productId={p.id} />
      <nav aria-label="Breadcrumb" className="mb-6 font-product text-xs uppercase tracking-[0.12em] text-muted"><Link href="/discover" className="hover:text-forest">Discover</Link> / <Link href={`/categories/${p.category_slug}`} className="hover:text-forest">{p.category_name}</Link></nav>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        {/* Gallery: large images stacked on desktop, swipeable on mobile */}
        <div className="lg:col-span-7">
          <div className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible lg:px-0">
            {gallery.map((im, i) => (
              <div key={i} className={`relative w-[88%] shrink-0 snap-center overflow-hidden bg-sand lg:w-auto ${i === 0 ? "lg:col-span-2" : ""}`} style={{ aspectRatio: i === 0 ? "4 / 5" : "1 / 1" }}>
                {im.url ? <img src={im.url} alt={im.alt ?? p.title} width={im.width ?? 800} height={im.height ?? 1000} decoding="async" fetchPriority={i === 0 ? "high" : "auto"} loading={i === 0 ? "eager" : "lazy"} className="h-full w-full object-cover" /> : null}
                {i === 0 && <WishButton productId={p.id} initial={wished.has(p.id)} className="absolute right-4 top-4 !h-11 !w-11" />}
              </div>))}
          </div>
          <p className="mt-2 font-product text-xs text-muted">Demo artwork — makers upload their own photographs.</p>
        </div>

        {/* Info */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start font-product">
          <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {p.is_new && <span className="bg-forest px-2 py-1 text-white">New</span>}{p.one_of_a_kind && <span className="bg-gold px-2 py-1">One of a kind</span>}{p.is_custom && <span className="bg-sand px-2 py-1 text-forest">Made to order</span>}
          </div>
          <Link href={`/makers/${p.seller_slug}`} className="mt-4 block text-xs uppercase tracking-[0.16em] text-terracotta">{p.brand_name}{p.seller_location ? ` · ${p.seller_location}` : ""}</Link>
          <h1 className="mt-2 font-serif text-4xl leading-tight md:text-5xl">{p.title}</h1>
          {p.rating ? <p className="mt-2 text-sm text-muted">★ {p.rating.toFixed(1)} · {p.review_count} {p.review_count === 1 ? "review" : "reviews"}</p> : null}
          <p className="mt-5 flex items-baseline gap-3"><span className="text-2xl font-medium">{formatINR(p.price_paise)}</span>
            {p.original_price_paise && p.original_price_paise > p.price_paise && (<><s className="text-muted">{formatINR(p.original_price_paise)}</s><span className="text-terracotta">{off}% off</span></>)}</p>
          <p className="mt-1 text-xs text-muted">Inclusive of taxes · shipping from {formatINR(ship)}</p>
          <div className="mt-4"><Flash err={sp.err} msg={sp.msg} /></div>
          {p.is_custom && <p className="mt-4 border-l-2 border-gold bg-sand/60 px-4 py-3 text-sm">Made to order — {p.seller_craft ? `${p.brand_name} ` : "the maker "}starts once you order. Preparation takes about {p.processing_days} days.</p>}
          {p.one_of_a_kind && <p className="mt-4 border-l-2 border-gold bg-sand/60 px-4 py-3 text-sm">Only one of this piece exists.</p>}

          {inStock ? (
            <form action={addToCartAction} className="mt-6 space-y-4">
              <input type="hidden" name="back" value={url} />
              {p.variants.length > 1 ? (
                <div><label htmlFor="variantId" className={`${label} mb-1 block`}>Option</label>
                  <select id="variantId" name="variantId" className={input}>{p.variants.map((v) => <option key={v.id} value={v.id} disabled={v.available <= 0}>{v.label}{v.available <= 0 ? " (sold out)" : ""}</option>)}</select></div>
              ) : <input type="hidden" name="variantId" value={p.variants[0].id} />}
              {!p.one_of_a_kind && <div><label htmlFor="qty" className={`${label} mb-1 block`}>Quantity</label><input id="qty" name="qty" type="number" min={1} max={Math.min(20, p.stock)} defaultValue={1} className={`${input} !w-24`} /></div>}
              {p.one_of_a_kind && <input type="hidden" name="qty" value="1" />}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="flex-1 bg-forest px-6 py-4 text-sm font-medium uppercase tracking-[0.1em] text-white transition hover:bg-forest/90">Add to bag</button>
                <button name="buyNow" value="1" className="flex-1 border border-forest px-6 py-4 text-sm font-medium uppercase tracking-[0.1em] text-forest transition hover:bg-forest/5">Buy now</button>
              </div>
              <p className="text-sm">{p.stock <= 5 ? <span className="text-terracotta">{p.stock === 1 ? "Just one available" : `${p.stock} available`}</span> : <span className="text-muted">In stock</span>}</p>
            </form>
          ) : <p className="mt-6 bg-sand px-4 py-4 text-sm">This piece has found a home — sold out. <Link href={`/makers/${p.seller_slug}`} className="underline underline-offset-4">See more from {p.brand_name}</Link>.</p>}

          <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed">{p.description}</p>

          {/* Save to a moodboard */}
          <details className="group mt-5 border-y border-line py-4 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between"><span className={label}>Save to a moodboard</span><span className="text-muted transition group-open:rotate-45">+</span></summary>
            {user ? (
              <form action={saveToBoardAction} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="productId" value={p.id} /><input type="hidden" name="back" value={url} />
                <div><label htmlFor="boardId" className="sr-only">Board</label>
                  <select id="boardId" name="boardId" className={`${input} !w-48`} defaultValue={boards[0]?.id ?? "new"}>{boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}<option value="new">+ New board…</option></select></div>
                <div><label htmlFor="newName" className="sr-only">New board name</label><input id="newName" name="newName" placeholder="New board name" className={`${input} !w-44`} /></div>
                <button className="border border-forest px-5 py-2.5 text-xs font-medium uppercase tracking-[0.1em] text-forest">Save</button>
              </form>) : <p className="mt-3 text-muted"><Link href={`/login?next=${encodeURIComponent(url)}`} className="underline underline-offset-4">Sign in</Link> to save pieces to boards you can come back to.</p>}
          </details>

          <dl className="mt-2 divide-y divide-line text-sm">
            {([
              ["Handmade by", p.brand_name], p.seller_craft ? ["Craft", p.seller_craft] : null,
              p.materials.length ? ["Materials", p.materials.join(", ")] : null, dims ? ["Dimensions", dims] : null, p.weight_grams ? ["Weight", `${p.weight_grams} g`] : null,
              p.moods.length ? ["Mood", p.moods.map((m) => MOODS.find((x) => x.key === m)?.label ?? m).join(", ")] : null,
              ["Processing", `${p.processing_days} ${p.processing_days === 1 ? "day" : "days"}`], ["Estimated delivery", `${lo}–${hi} days after you order`],
            ] as (string[] | null)[]).filter((r): r is string[] => !!r).map(([k, v]) => <div key={k} className="flex justify-between gap-6 py-3"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>)}
          </dl>
          <details className="mt-1 border-t border-line py-4 text-sm"><summary className={`${label} cursor-pointer`}>Shipping &amp; returns</summary>
            <p className="mt-3 text-muted">Ships from {p.seller_location ?? "the maker's workshop"} in {p.processing_days} days; delivery in {lo}–{hi} days. Shipping is {formatINR(ship)} for this parcel and is calculated per maker.</p>
            <p className="mt-2 text-muted">{p.is_custom ? "Made-to-order pieces can't be returned unless they arrive damaged." : `Returns are accepted within ${settings.returnWindowDays} days of delivery if it arrives damaged or not as described.`} See the <Link href="/returns" className="underline underline-offset-4">returns policy</Link>.</p></details>
        </div>
      </div>

      {/* The maker + the making */}
      <section className="mt-20 grid gap-10 border-t border-line pt-16 lg:grid-cols-12">
        <div className="lg:col-span-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">The maker</p>
          <div className="mt-4 flex items-center gap-5"><span className="block h-24 w-24 shrink-0 overflow-hidden bg-sand">{p.seller_image && <img src={p.seller_image} alt="" loading="lazy" className="h-full w-full object-cover" />}</span>
            <div><Link href={`/makers/${p.seller_slug}`} className="font-serif text-3xl hover:text-terracotta">{p.brand_name}</Link>
              <p className="font-product text-sm text-muted">{p.seller_location}{p.seller_craft ? ` · ${p.seller_craft}` : ""}</p>
              <div className="mt-3"><FollowButton sellerId={p.seller_id} initial={followed.has(p.seller_id)} size="sm" /></div></div></div>
          {p.seller_tagline && <p className="mt-6 font-serif text-2xl italic leading-snug text-forest">“{p.seller_tagline}”</p>}</div>
        <div className="font-product lg:col-span-6 lg:col-start-7">
          <p className="leading-relaxed text-muted">{p.seller_story}</p>
          {p.process_note && <div className="mt-8 border-l-2 border-gold pl-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">How it&apos;s made</p><p className="mt-2 leading-relaxed">{p.process_note}</p></div>}
          <Link href={`/makers/${p.seller_slug}`} className="mt-8 inline-block border-b border-charcoal pb-0.5 text-xs font-semibold uppercase tracking-[0.14em] hover:border-terracotta hover:text-terracotta">More from {p.brand_name} →</Link></div>
      </section>

      <section className="mt-20 border-t border-line pt-16" aria-labelledby="reviews"><h2 id="reviews" className="text-4xl">Reviews</h2>
        {p.reviews.length === 0 ? <p className="mt-3 font-product text-sm text-muted">No reviews yet — only people who&apos;ve received this piece can review it.</p> : (
          <ul className="mt-6 grid gap-6 font-product md:grid-cols-2">{p.reviews.map((r) => <li key={r.id} className="border border-line p-5 text-sm">
            <p className="text-terracotta" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p><p className="mt-2 leading-relaxed">{r.body}</p>
            <p className="mt-3 text-xs text-muted">{r.name ?? "Customer"} · Verified buyer · {new Date(r.created_at).toLocaleDateString("en-IN")}</p></li>)}</ul>)}
      </section>

      {more.length > 0 && <section className="mt-20 border-t border-line pt-16"><h2 className="mb-8 text-4xl">You might also love</h2>
        <Masonry>{more.map((r, i) => <ProductCard key={r.id} product={r} wished={wished.has(r.id)} index={i} />)}</Masonry></section>}
    </div>
  );
}
