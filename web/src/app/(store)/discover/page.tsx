import { ProductListing } from "@/components/storefront/product-listing";
export const metadata = { title: "Discover" };

export default function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <header className="mb-10 max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">The discovery feed</p>
        <h1 className="mt-2 text-5xl leading-[1.05] md:text-6xl">Find something you didn&apos;t know you needed</h1>
        <p className="mt-4 font-product text-muted">Wander by mood, save what you love, and follow the makers whose work you want to see more of.</p></header>
      <ProductListing searchParams={searchParams} base="/discover" showCategories personalise />
    </div>
  );
}
