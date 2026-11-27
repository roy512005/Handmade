import Link from "next/link";
import { getUser } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { moveWishlistToCart, wishlistAction } from "@/app/actions/shop";
import { btn, btnSm, card, Flash, PageTitle, ProductImage } from "@/components/ui";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const user = (await getUser())!;
  const rows = await q<{ id: string; title: string; price_paise: number; brand_name: string; image_url: string | null; available: boolean }>(
    `select p.id, p.title, p.price_paise, s.brand_name, (select url from product_images where product_id = p.id order by position limit 1) image_url,
       (p.status = 'approved' and exists (select 1 from product_variants v join product_inventory i on i.variant_id = v.id where v.product_id = p.id and i.on_hand - i.reserved > 0)) available
     from wishlist_items wi join wishlists w on w.id = wi.wishlist_id join products p on p.id = wi.product_id join seller_profiles s on s.id = p.seller_id
     where w.user_id = $1 order by wi.added_at desc`, [user.id]);
  return (
    <>
      <PageTitle title="Wishlist" /><Flash err={sp.err} />
      {rows.length === 0 ? <p className="text-sm text-muted">Nothing saved yet. Tap ♡ on any product. <Link href="/discover" className="text-forest underline">Discover pieces</Link></p> : (
        <ul className="grid gap-4 sm:grid-cols-2">{rows.map((r) => <li key={r.id} className={`${card} flex gap-4`}>
          <Link href={`/products/${r.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-control"><ProductImage url={r.image_url} title={r.title} /></Link>
          <div className="flex-1 text-sm"><p className="text-xs text-muted">{r.brand_name}</p><Link href={`/products/${r.id}`} className="font-medium">{r.title}</Link><p>{formatINR(r.price_paise)}</p>
            <div className="mt-2 flex gap-2">{r.available ? <form action={moveWishlistToCart}><input type="hidden" name="productId" value={r.id} /><button className={`${btn} ${btnSm}`}>Move to cart</button></form> : <span className="text-xs text-muted">Unavailable</span>}
              <form action={wishlistAction}><input type="hidden" name="productId" value={r.id} /><button className="text-xs text-error underline">Remove</button></form></div></div></li>)}</ul>)}
    </>
  );
}
