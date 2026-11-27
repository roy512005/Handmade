/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { getSellerBySlug } from "@/lib/server/catalog";
import { getUser } from "@/lib/server/auth";
import { followedIds } from "@/lib/server/social";
import { ProductListing } from "@/components/storefront/product-listing";
import { FollowButton } from "@/components/storefront/follow-button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const s = await getSellerBySlug((await params).slug);
  return { title: s?.brand_name ?? "Maker" };
}

export default async function MakerPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const s = await getSellerBySlug(slug);
  if (!s) notFound();
  const user = await getUser();
  const followed = await followedIds(user?.id);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <header className="mb-14 grid items-center gap-10 border-b border-line pb-14 lg:grid-cols-12">
        <div className="lg:col-span-4"><div className="aspect-[4/5] overflow-hidden bg-sand">{s.profile_image_url && <img src={s.profile_image_url} alt="" className="h-full w-full object-cover" />}</div></div>
        <div className="lg:col-span-7 lg:col-start-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">{s.location}{s.craft ? ` · ${s.craft}` : ""}</p>
          <h1 className="mt-3 text-5xl leading-[1.05] md:text-7xl">{s.brand_name}</h1>
          {s.tagline && <p className="mt-4 font-serif text-2xl italic text-forest">“{s.tagline}”</p>}
          <p className="mt-6 max-w-xl font-product leading-relaxed text-muted">{s.story}</p>
          <div className="mt-8 flex items-center gap-6 font-product"><FollowButton sellerId={s.id} initial={followed.has(s.id)} />
            <p className="text-sm text-muted">{s.n} {s.n === 1 ? "piece" : "pieces"} · {s.followers} {s.followers === 1 ? "follower" : "followers"}</p></div>
        </div>
      </header>
      <h2 className="mb-8 text-3xl">Creations by {s.brand_name}</h2>
      <ProductListing searchParams={searchParams} base={`/makers/${slug}`} fixed={{ seller: slug }} />
    </div>
  );
}
