import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/server/auth";
import { boardWithItems } from "@/lib/server/social";
import { productsByIds } from "@/lib/server/catalog";
import { wishlistIds } from "@/lib/server/wishlist";
import { boardItemAction } from "@/app/actions/social";
import { btn2, btnDanger, btnSm, Flash, PageTitle } from "@/components/ui";
import { Masonry, ProductCard } from "@/components/storefront/product-card";

export const metadata = { title: "Moodboard" };

export default async function BoardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ err?: string; msg?: string }> }) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, getUser()]);
  const b = await boardWithItems(id);
  if (!b || b.user_id !== user!.id) notFound();
  const [items, wished] = await Promise.all([productsByIds(b.ids), wishlistIds(user!.id)]);
  const act = (op: string, text: string, cls: string) => <form action={boardItemAction}><input type="hidden" name="boardId" value={b.id} /><input type="hidden" name="op" value={op} /><button className={`${cls} ${btnSm}`}>{text}</button></form>;
  return (
    <>
      <Link href="/account/boards" className="text-sm text-muted">← All boards</Link>
      <PageTitle title={b.name} sub={`${items.length} ${items.length === 1 ? "piece" : "pieces"} · ${b.is_public ? "Anyone with the link can view" : "Only you can see this"}`}
        action={<div className="flex gap-2">{act("toggle_public", b.is_public ? "Make private" : "Share board", btn2)}{act("delete", "Delete board", btnDanger)}</div>} /><Flash {...sp} />
      {b.is_public && <p className="mb-6 text-sm">Shareable link: <Link className="underline underline-offset-4" href={`/boards/${b.id}`}>/boards/{b.id}</Link></p>}
      {items.length === 0 ? <p className="text-sm text-muted">Nothing saved here yet.</p> : (
        <Masonry className="!columns-2 md:!columns-2 xl:!columns-3">{items.map((p, i) => (
          <div key={p.id}><ProductCard product={p} wished={wished.has(p.id)} index={i} />
            <form action={boardItemAction} className="mt-2"><input type="hidden" name="boardId" value={b.id} /><input type="hidden" name="productId" value={p.id} /><input type="hidden" name="op" value="remove" /><button className="text-xs text-muted underline underline-offset-4">Remove from board</button></form></div>))}</Masonry>)}
    </>
  );
}
