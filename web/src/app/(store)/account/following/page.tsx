/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getUser } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { listProducts } from "@/lib/server/catalog";
import { wishlistIds } from "@/lib/server/wishlist";
import { FollowButton } from "@/components/storefront/follow-button";
import { Masonry, ProductCard } from "@/components/storefront/product-card";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Following" };

export default async function Following() {
  const user = (await getUser())!;
  const makers = await q<{ id: string; brand_name: string; slug: string; location: string | null; craft: string | null; profile_image_url: string | null }>(
    `select s.id, s.brand_name, s.slug, s.location, s.craft, s.profile_image_url from follows f join seller_profiles s on s.id = f.seller_id where f.user_id = $1 and s.status = 'approved' order by f.created_at desc`, [user.id]);
  const [recent, wished] = await Promise.all([
    makers.length ? Promise.all(makers.map((m) => listProducts({ seller: m.slug, sort: "newest", pageSize: 6 }))) : Promise.resolve([]), wishlistIds(user.id)]);
  const feed = recent.flatMap((r) => r.rows).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 12);
  return (
    <>
      <PageTitle title="Following" sub="New creations from the makers you follow." />
      {makers.length === 0 ? <p className="text-sm text-muted">You aren&apos;t following anyone yet. Visit <Link href="/stories" className="underline underline-offset-4">Artisan Stories</Link> and follow a maker to see their new work here.</p> : (
        <>
          <ul className="mb-10 grid gap-4 sm:grid-cols-2">{makers.map((m) => (
            <li key={m.id} className="flex items-center gap-4 border border-line p-3"><span className="h-14 w-14 shrink-0 overflow-hidden bg-sand">{m.profile_image_url && <img src={m.profile_image_url} alt="" className="h-full w-full object-cover" />}</span>
              <div className="min-w-0 flex-1"><Link href={`/makers/${m.slug}`} className="block truncate font-serif text-lg hover:text-terracotta">{m.brand_name}</Link><p className="truncate text-xs text-muted">{m.location}{m.craft ? ` · ${m.craft}` : ""}</p></div>
              <FollowButton sellerId={m.id} initial size="sm" /></li>))}</ul>
          <h2 className="mb-5 text-2xl">New from your makers</h2>
          <Masonry className="!columns-2 xl:!columns-3">{feed.map((p, i) => <ProductCard key={p.id} product={p} wished={wished.has(p.id)} index={i} />)}</Masonry>
        </>)}
    </>
  );
}
