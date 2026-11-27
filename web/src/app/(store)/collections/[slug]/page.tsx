import { notFound } from "next/navigation";
import { q1 } from "@/lib/server/db";
import { ProductListing } from "@/components/storefront/product-listing";

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const c = await q1<{ title: string; description: string | null }>("select title, description from collections where slug = $1 and active", [slug]);
  if (!c) notFound();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Collection</p><h1 className="mt-2 text-5xl leading-tight md:text-6xl">{c.title}</h1><p className="mb-10 mt-3 max-w-xl font-product text-muted">{c.description}</p>
      <ProductListing searchParams={searchParams} base={`/collections/${slug}`} fixed={{ collection: slug }} />
    </div>
  );
}
