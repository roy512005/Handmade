/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getCategories } from "@/lib/server/catalog";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const cats = await getCategories();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14">
      <header className="mb-12 max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">Browse</p><h1 className="mt-3 text-5xl leading-tight md:text-6xl">Categories</h1></header>
      <ul className="columns-2 gap-4 md:columns-3 md:gap-6 [&>li]:mb-6 [&>li]:break-inside-avoid">
        {cats.map((c, i) => (
          <li key={c.slug} className="reveal" style={{ ["--i" as string]: i }}>
            <Link href={`/categories/${c.slug}`} className="group relative block overflow-hidden bg-sand">
              <div className={["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[5/4]"][i % 4]}>{c.cover && <img src={c.cover} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />}</div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-4 pt-16 text-white"><p className="font-serif text-2xl">{c.name}</p><p className="font-product text-xs text-white/80">{c.n} {c.n === 1 ? "piece" : "pieces"}</p></div>
            </Link>
          </li>))}
      </ul>
    </div>
  );
}
