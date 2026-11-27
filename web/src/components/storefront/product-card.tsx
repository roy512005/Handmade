/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { ProductCardRow } from "@/lib/server/catalog";
import { discountPercent, formatINR } from "@/lib/money";
import { WishButton } from "./wish-button";

/** Editorial card: the photograph leads, in its own proportions (masonry-friendly). */
export function ProductCard({ product: p, wished = false, index = 0, ratio }: { product: ProductCardRow; wished?: boolean; back?: string; index?: number; ratio?: string }) {
  const off = p.original_price_paise ? discountPercent(p.price_paise, p.original_price_paise) : 0;
  const aspect = ratio ?? (p.img_w && p.img_h ? `${p.img_w} / ${p.img_h}` : "4 / 5");
  return (
    <article className="reveal group relative font-product" style={{ ["--i" as string]: Math.min(index, 12) }}>
      <Link href={`/products/${p.id}`} className="block">
        <div className="relative overflow-hidden bg-sand" style={{ aspectRatio: aspect }}>
          {p.image_url ? <img src={p.image_url} alt={p.title} width={p.img_w ?? 800} height={p.img_h ?? 1000} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]" /> : null}
          {p.image2 && <img src={p.image2} alt="" aria-hidden="true" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]">
            {p.is_new && <span className="bg-forest px-2 py-1 text-white">New</span>}
            {p.one_of_a_kind && <span className="bg-gold px-2 py-1 text-charcoal">One of a kind</span>}
            {p.is_custom && <span className="bg-ivory px-2 py-1 text-forest">Made to order</span>}
          </div>
          {p.stock <= 0 && <span className="absolute bottom-3 left-3 bg-charcoal px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Sold</span>}
        </div>
        <div className="pt-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{p.brand_name}</p>
          <h3 className="mt-0.5 font-serif text-[17px] leading-snug">{p.title}</h3>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium">{formatINR(p.price_paise)}</span>
            {p.original_price_paise && p.original_price_paise > p.price_paise && (<><s className="text-muted">{formatINR(p.original_price_paise)}</s><span className="text-terracotta">{off}% off</span></>)}
          </p>
        </div>
      </Link>
      <WishButton productId={p.id} initial={wished} className="absolute right-3 top-3 opacity-100 md:opacity-0 md:transition md:group-hover:opacity-100 md:focus-visible:opacity-100 [&[aria-pressed=true]]:md:opacity-100" />
    </article>
  );
}

/** CSS-column masonry: items keep their own heights; no JS layout. */
export function Masonry({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`columns-2 gap-4 md:columns-3 md:gap-6 xl:columns-4 [&>*]:mb-8 [&>*]:break-inside-avoid ${className}`}>{children}</div>;
}
