import { requireAdmin } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { getSettings } from "@/lib/server/settings";
import { categoryAction, collectionAction, settingsAction } from "@/app/actions/admin";
import { Badge, btn, btn2, btnSm, card, Field, Flash, input, PageTitle } from "@/components/ui";

export const metadata = { title: "Content & settings" };

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin("content");
  const [cats, cols, products, st] = await Promise.all([
    q<{ id: string; name: string; active: boolean }>("select id, name, active from categories order by sort_order"),
    q<{ id: string; title: string; active: boolean; n: number }>("select c.id, c.title, c.active, (select count(*)::int from collection_products where collection_id = c.id) n from collections c order by c.title"),
    q<{ id: string; title: string }>("select id, title from products where status = 'approved' order by title"), getSettings(),
  ]);
  const r = (p: number) => String(p / 100);
  return (
    <>
      <PageTitle title="Content & settings" /><Flash {...sp} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className={card}><h2 className="text-xl">Categories</h2>
          <ul className="mt-3 space-y-2 text-sm">{cats.map((c) => <li key={c.id} className="flex items-center justify-between"><span>{c.name} {!c.active && <Badge>Hidden</Badge>}</span>
            <form action={categoryAction}><input type="hidden" name="op" value="toggle" /><input type="hidden" name="id" value={c.id} /><button className={`${btn2} ${btnSm}`}>{c.active ? "Hide" : "Show"}</button></form></li>)}</ul>
          <form action={categoryAction} className="mt-4 flex gap-2"><input type="hidden" name="op" value="add" /><label htmlFor="cn" className="sr-only">New category</label><input id="cn" name="name" placeholder="New category" className={input} /><button className={btn}>Add</button></form></section>
        <section className={card}><h2 className="text-xl">Curated collections</h2>
          <ul className="mt-3 space-y-2 text-sm">{cols.map((c) => <li key={c.id} className="flex items-center justify-between"><span>{c.title} · {c.n} products {!c.active && <Badge>Hidden</Badge>}</span>
            <form action={collectionAction}><input type="hidden" name="op" value="toggle" /><input type="hidden" name="id" value={c.id} /><button className={`${btn2} ${btnSm}`}>{c.active ? "Hide" : "Show"}</button></form></li>)}</ul>
          <form action={collectionAction} className="mt-4 space-y-2"><input type="hidden" name="op" value="add" /><input name="title" placeholder="New collection title" className={input} aria-label="Collection title" /><input name="description" placeholder="Description" className={input} aria-label="Collection description" /><button className={btn}>Create</button></form>
          {cols.length > 0 && <form action={collectionAction} className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4"><input type="hidden" name="op" value="addProduct" />
            <select name="collectionId" className={`${input} !w-40`} aria-label="Collection">{cols.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
            <select name="productId" className={`${input} !w-48`} aria-label="Product">{products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}</select><button className={btn2}>Add product</button></form>}</section>
      </div>
      <form action={settingsAction} className={`${card} mt-6 grid max-w-3xl gap-4 sm:grid-cols-2`}><h2 className="text-xl sm:col-span-2">Commission, returns &amp; shipping</h2>
        <Field label="Default commission (%)" name="commission" defaultValue={st.commissionBps / 100} hint="Pilot range: 10–12%. Applies to new orders." /><Field label="Return window (days after delivery)" name="window" defaultValue={st.returnWindowDays} hint="Seller earnings are released after this." />
        <Field label="Base shipping per parcel (₹)" name="base" defaultValue={r(st.shippingBase)} /><Field label="Per extra 500 g (₹)" name="per" defaultValue={r(st.shippingPer500g)} />
        <Field label="Free shipping over (₹, blank = off)" name="free" defaultValue={st.freeShippingOver ? r(st.freeShippingOver) : ""} /><div className="self-end"><button className={btn}>Save settings</button></div></form>
    </>
  );
}
