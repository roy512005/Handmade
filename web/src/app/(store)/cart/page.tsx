import Link from "next/link";
import { getCartSummary } from "@/lib/server/cart";
import { formatINR } from "@/lib/money";
import { cartItemAction, couponAction } from "@/app/actions/shop";
import { btn, btn2, card, Flash, input, PageTitle, ProductImage } from "@/components/ui";

export const metadata = { title: "Your cart" };

export default async function CartPage({ searchParams }: { searchParams: Promise<{ err?: string; msg?: string }> }) {
  const sp = await searchParams;
  const s = await getCartSummary();
  const empty = s.groups.length === 0 && s.saved.length === 0;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageTitle title="Your cart" />
      <Flash err={sp.err} msg={sp.msg} />
      {s.problems.map((p) => <Flash key={p} err={p} />)}
      {empty && <div className={`${card} text-center`}><p className="font-serif text-2xl">Your cart is empty</p><Link href="/discover" className={`${btn} mt-4`}>Discover handmade pieces</Link></div>}
      {!empty && (
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            {s.groups.map((g) => (
              <section key={g.sellerId} className={card}>
                <h2 className="text-lg">From {g.brand}</h2>
                <ul className="mt-3 divide-y divide-line">
                  {g.lines.map((l) => (
                    <li key={l.itemId} className="flex gap-4 py-4">
                      <Link href={`/products/${l.productId}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-control"><ProductImage url={l.imageUrl} title={l.title} /></Link>
                      <div className="flex-1 text-sm">
                        <Link href={`/products/${l.productId}`} className="font-medium">{l.title}</Link>
                        {l.variantLabel !== "Default" && <p className="text-muted">{l.variantLabel}</p>}
                        <p className="mt-1">{formatINR(l.unitPrice)}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <form action={cartItemAction} className="flex items-center gap-2"><input type="hidden" name="itemId" value={l.itemId} /><input type="hidden" name="op" value="qty" />
                            <label htmlFor={`q-${l.itemId}`} className="sr-only">Quantity</label>
                            <input id={`q-${l.itemId}`} name="qty" type="number" min={1} max={Math.max(1, l.available)} defaultValue={l.quantity} className={`${input} !w-16`} />
                            <button className="text-forest underline">Update</button></form>
                          <form action={cartItemAction}><input type="hidden" name="itemId" value={l.itemId} /><input type="hidden" name="op" value="save" /><button className="text-muted underline">Save for later</button></form>
                          <form action={cartItemAction}><input type="hidden" name="itemId" value={l.itemId} /><input type="hidden" name="op" value="remove" /><button className="text-error underline">Remove</button></form>
                        </div>
                      </div>
                      <p className="text-sm font-medium">{formatINR(l.unitPrice * l.quantity)}</p>
                    </li>))}
                </ul>
                <p className="mt-2 text-right text-xs text-muted">Shipping from this maker: {formatINR(g.shipping)}</p>
              </section>))}
            {s.saved.length > 0 && <section className={card}><h2 className="text-lg">Saved for later</h2>
              <ul className="mt-3 divide-y divide-line text-sm">{s.saved.map((l) => <li key={l.itemId} className="flex items-center justify-between gap-3 py-3"><span>{l.title} · {formatINR(l.unitPrice)}</span>
                <span className="flex gap-3"><form action={cartItemAction}><input type="hidden" name="itemId" value={l.itemId} /><input type="hidden" name="op" value="restore" /><button className="text-forest underline">Move to cart</button></form>
                  <form action={cartItemAction}><input type="hidden" name="itemId" value={l.itemId} /><input type="hidden" name="op" value="remove" /><button className="text-error underline">Remove</button></form></span></li>)}</ul></section>}
          </div>
          {s.groups.length > 0 && (
            <aside className={`${card} h-fit space-y-3 text-sm`}>
              <h2 className="text-xl">Summary</h2>
              <form action={couponAction} className="flex gap-2"><label htmlFor="code" className="sr-only">Coupon code</label>
                <input id="code" name="code" placeholder="Coupon code" defaultValue={s.couponCode ?? ""} className={input} /><button className={`${btn2} !px-3`}>Apply</button></form>
              {s.couponError && <p className="text-xs text-error">{s.couponError}</p>}
              <Row k={`Subtotal (${s.count} items)`} v={formatINR(s.subtotal)} />
              <Row k="Shipping" v={formatINR(s.shipping)} />
              {s.discount > 0 && <Row k={`Discount (${s.couponCode})`} v={`− ${formatINR(s.discount)}`} accent />}
              <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><span>Total</span><span>{formatINR(s.total)}</span></div>
              {s.groups.length > 1 && <p className="text-xs text-muted">Your items ship separately from {s.groups.length} makers.</p>}
              <Link href="/checkout" className={`${btn} w-full ${s.problems.length ? "pointer-events-none opacity-50" : ""}`}>Checkout</Link>
            </aside>)}
        </div>)}
    </div>
  );
}
const Row = ({ k, v, accent }: { k: string; v: string; accent?: boolean }) => <div className={`flex justify-between ${accent ? "text-forest" : ""}`}><span className="text-muted">{k}</span><span>{v}</span></div>;
