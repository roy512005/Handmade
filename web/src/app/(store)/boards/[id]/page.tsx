import { notFound } from "next/navigation";
import { boardWithItems } from "@/lib/server/social";
import { productsByIds } from "@/lib/server/catalog";
import { getUser } from "@/lib/server/auth";
import { wishlistIds } from "@/lib/server/wishlist";
import { Masonry, ProductCard } from "@/components/storefront/product-card";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const b = await boardWithItems((await params).id);
  return { title: b?.is_public ? b.name : "Moodboard" };
}

/** Public, read-only view of a shared moodboard. Private boards 404. */
export default async function PublicBoard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await boardWithItems(id);
  if (!b || !b.is_public) notFound();
  const user = await getUser();
  const [items, wished] = await Promise.all([productsByIds(b.ids), wishlistIds(user?.id)]);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Moodboard{b.owner ? ` by ${b.owner.split(" ")[0]}` : ""}</p>
      <h1 className="mb-10 mt-2 text-5xl leading-tight md:text-6xl">{b.name}</h1>
      <Masonry>{items.map((p, i) => <ProductCard key={p.id} product={p} wished={wished.has(p.id)} index={i} />)}</Masonry>
    </div>
  );
}
