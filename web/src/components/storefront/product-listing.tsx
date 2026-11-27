import Link from "next/link";
import { distinctMaterials, getCategories, listProducts, SORTS, type SortKey } from "@/lib/server/catalog";
import { getUser } from "@/lib/server/auth";
import { wishlistIds } from "@/lib/server/wishlist";
import { interestSignals } from "@/lib/server/social";
import { parseRupees } from "@/lib/money";
import { MOODS } from "@/lib/art";
import { btn, input, NumberPager, qs } from "@/components/ui";
import { Masonry, ProductCard } from "./product-card";

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export async function ProductListing({ searchParams, base, fixed = {}, showCategories = false, personalise = false }: {
  searchParams: Promise<Params>; base: string; fixed?: { category?: string; seller?: string; collection?: string }; showCategories?: boolean; personalise?: boolean;
}) {
  const sp = await searchParams;
  const user = await getUser();
  const signals = personalise && user ? await interestSignals(user.id) : null;
  const hasSignals = !!signals && (signals.cats.length + signals.moods.length + signals.sellers.length > 0);

  const q = first(sp.q), min = first(sp.min), max = first(sp.max), material = first(sp.material), mood = first(sp.mood), category = first(sp.category) ?? fixed.category;
  const sortRaw = first(sp.sort);
  const validSort = SORTS.some((s) => s.value === sortRaw) ? (sortRaw as SortKey) : undefined;
  const sort: SortKey = validSort === "for-you" && !hasSignals ? "newest" : validSort ?? (hasSignals ? "for-you" : "newest");
  const custom = first(sp.custom) === "1", inStock = first(sp.stock) === "1", isNew = first(sp.new) === "1", one = first(sp.one) === "1";
  const page = Math.max(1, Number(first(sp.page)) || 1);

  const [res, materials, cats] = await Promise.all([
    listProducts({ ...fixed, category, q, sort, material, custom, inStock, page, mood, isNew, oneOfAKind: one, pageSize: 16, prefs: sort === "for-you" ? signals ?? undefined : undefined,
      min: min ? parseRupees(min) ?? undefined : undefined, max: max ? parseRupees(max) ?? undefined : undefined }),
    distinctMaterials(), showCategories ? getCategories() : Promise.resolve([]),
  ]);
  const wished = await wishlistIds(user?.id);
  const keep = { q, mood, category: showCategories ? category : undefined, sort: validSort, min, max, material, stock: inStock ? "1" : "", custom: custom ? "1" : "", new: isNew ? "1" : "", one: one ? "1" : "" };
  const href = (p: number) => qs(base, { ...keep, page: p > 1 ? String(p) : "" });
  const chip = (active: boolean) => `whitespace-nowrap border px-4 py-1.5 text-[13px] transition ${active ? "border-forest bg-forest text-white" : "border-line bg-transparent hover:border-forest"}`;

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by mood">
          <Link href={qs(base, { ...keep, mood: "" })} className={chip(!mood)}>All moods</Link>
          {MOODS.map((m) => <Link key={m.key} href={qs(base, { ...keep, mood: m.key })} className={chip(mood === m.key)} aria-pressed={mood === m.key}>{m.label}</Link>)}
        </div>
        {showCategories && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Filter by category">
            <Link href={qs(base, { ...keep, category: "" })} className={chip(!category)}>Everything</Link>
            {cats.map((c) => <Link key={c.slug} href={qs(base, { ...keep, category: c.slug })} className={chip(category === c.slug)}>{c.name}</Link>)}
          </div>)}
        <form action={base} className="flex flex-wrap items-end gap-3 border-y border-line py-4 text-sm font-product">
          {(q !== undefined) && <input type="hidden" name="q" value={q} />}{mood && <input type="hidden" name="mood" value={mood} />}{showCategories && category && <input type="hidden" name="category" value={category} />}
          <div><label htmlFor="sort" className="mb-1 block text-xs uppercase tracking-[0.12em] text-muted">Sort</label>
            <select id="sort" name="sort" defaultValue={sort} className={input}>{SORTS.filter((s) => s.value !== "for-you" || hasSignals).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          <div><label htmlFor="min" className="mb-1 block text-xs uppercase tracking-[0.12em] text-muted">Price (₹)</label>
            <div className="flex gap-2"><input id="min" name="min" inputMode="numeric" placeholder="Min" defaultValue={min} className={`${input} !w-24`} /><input name="max" inputMode="numeric" placeholder="Max" defaultValue={max} aria-label="Maximum price" className={`${input} !w-24`} /></div></div>
          <div><label htmlFor="material" className="mb-1 block text-xs uppercase tracking-[0.12em] text-muted">Material</label>
            <select id="material" name="material" defaultValue={material ?? ""} className={input}><option value="">Any</option>{materials.map((m) => <option key={m}>{m}</option>)}</select></div>
          <label className="flex items-center gap-2 pb-2"><input type="checkbox" name="stock" value="1" defaultChecked={inStock} /> In stock</label>
          <label className="flex items-center gap-2 pb-2"><input type="checkbox" name="one" value="1" defaultChecked={one} /> One of a kind</label>
          <label className="flex items-center gap-2 pb-2"><input type="checkbox" name="new" value="1" defaultChecked={isNew} /> New this fortnight</label>
          <button className={btn}>Apply</button>
          <Link href={base} className="pb-2.5 text-xs uppercase tracking-[0.12em] text-muted underline underline-offset-4">Clear</Link>
        </form>
      </div>

      <p className="mb-6 font-product text-sm text-muted" aria-live="polite">
        {res.total} {res.total === 1 ? "piece" : "pieces"}{q ? ` for “${q}”` : ""}
        {sort === "for-you" && " · picked for you from your wishlist, boards and the makers you follow"}
        {personalise && !user && " · "}{personalise && !user && <Link href="/login?next=/discover" className="underline underline-offset-4">Sign in for picks tailored to you</Link>}
      </p>

      {res.rows.length === 0 ? (
        <div className="border border-line bg-white/50 px-6 py-16 text-center">
          <p className="font-serif text-3xl">Nothing here yet</p>
          <p className="mx-auto mt-2 max-w-sm font-product text-sm text-muted">Try fewer filters, or wander somewhere new.</p>
          <div className="mt-5 flex justify-center gap-6 font-product text-sm text-forest underline underline-offset-4"><Link href="/discover">Discover everything</Link><Link href="/stories">Meet the makers</Link></div>
        </div>
      ) : (
        <Masonry>{res.rows.map((p, i) => <ProductCard key={p.id} product={p} wished={wished.has(p.id)} index={i} />)}</Masonry>
      )}
      <NumberPager page={res.page} pages={res.pages} href={href} />
    </div>
  );
}
