import { notFound } from "next/navigation";
import { getCategory } from "@/lib/server/catalog";
import { ProductListing } from "@/components/storefront/product-listing";

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) notFound();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Category</p><h1 className="mb-10 mt-2 text-5xl leading-tight md:text-6xl">{c.name}</h1>
      <ProductListing searchParams={searchParams} base={`/categories/${c.slug}`} fixed={{ category: c.slug }} />
    </div>
  );
}
