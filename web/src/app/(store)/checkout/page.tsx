import { randomUUID } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/server/auth";
import { getCartSummary } from "@/lib/server/cart";
import { q } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { placeOrderAction } from "@/app/actions/shop";
import { btn, card, Field, Flash, PageTitle } from "@/components/ui";

export const metadata = { title: "Checkout" };
type Addr = { id: string; name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; is_default: boolean };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (!user) redirect("/login?next=/checkout");
  const s = await getCartSummary();
  if (!s.groups.length) redirect("/cart");
  const addrs = await q<Addr>("select id, name, phone, line1, line2, city, state, pincode, is_default from addresses where user_id = $1 and kind = 'shipping' order by is_default desc, created_at", [user.id]);
  const key = randomUUID();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageTitle title="Checkout" sub={`Signed in as ${user.email}`} />
      <Flash err={sp.err} />
      <form action={placeOrderAction} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <input type="hidden" name="key" value={key} />
        <div className="space-y-6">
          <section className={card}><h2 className="text-xl">1. Delivery address</h2>
            <div className="mt-4 space-y-3">
              {addrs.map((a, i) => (
                <label key={a.id} className="flex cursor-pointer items-start gap-3 rounded-control border border-line p-3 text-sm has-[:checked]:border-forest has-[:checked]:bg-sage/30">
                  <input type="radio" name="addressId" value={a.id} defaultChecked={i === 0} className="mt-1" />
                  <span><b>{a.name}</b> · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}</span></label>))}
              <label className="flex cursor-pointer items-start gap-3 rounded-control border border-line p-3 text-sm has-[:checked]:border-forest">
                <input type="radio" name="addressId" value="new" defaultChecked={addrs.length === 0} className="mt-1" /><span className="font-medium">Use a new address</span></label>
              <div className="grid gap-3 rounded-control bg-sand/40 p-3 sm:grid-cols-2">
                <Field label="Full name" name="name" /><Field label="Mobile" name="phone" />
                <div className="sm:col-span-2"><Field label="Address" name="line1" /></div>
                <div className="sm:col-span-2"><Field label="Apartment, landmark (optional)" name="line2" /></div>
                <Field label="City" name="city" /><Field label="State" name="state" /><Field label="PIN code" name="pincode" />
                <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="saveAddress" defaultChecked /> Save this address</label>
              </div>
            </div></section>
          <section className={card}><h2 className="text-xl">2. Review items</h2>
            {s.groups.map((g) => <div key={g.sellerId} className="mt-4 text-sm"><p className="font-medium">From {g.brand} <span className="font-normal text-muted">· shipping {formatINR(g.shipping)}</span></p>
              <ul className="mt-1 text-muted">{g.lines.map((l) => <li key={l.itemId}>{l.quantity} × {l.title}</li>)}</ul></div>)}
            <Link href="/cart" className="mt-3 inline-block text-sm text-forest underline">Edit cart</Link></section>
          <section className={card}><h2 className="text-xl">3. Payment</h2>
            <p className="mt-3 text-sm">UPI, cards and net banking are available on the secure payment page.</p>
            <p className="mt-1 text-xs text-muted">Test mode: payments are simulated — no real money moves.</p></section>
        </div>
        <aside className={`${card} h-fit space-y-2 text-sm`}>
          <h2 className="text-xl">Order total</h2>
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatINR(s.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Shipping</span><span>{formatINR(s.shipping)}</span></div>
          {s.discount > 0 && <div className="flex justify-between text-forest"><span>Discount ({s.couponCode})</span><span>− {formatINR(s.discount)}</span></div>}
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><span>Total</span><span>{formatINR(s.total)}</span></div>
          <button className={`${btn} w-full`}>Place order &amp; pay</button>
        </aside>
      </form>
    </div>
  );
}
