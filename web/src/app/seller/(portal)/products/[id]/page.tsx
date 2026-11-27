import { notFound } from "next/navigation";
import { requireSeller } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { isUuid } from "@/lib/server/catalog";
import { productStatusAction, resumeProductAction } from "@/app/actions/seller";
import { Badge, btn2, btnDanger, Flash, label, PageTitle, statusColor } from "@/components/ui";
import { ProductForm } from "@/components/seller/product-form";

export const metadata = { title: "Edit product" };

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const [{ id }, sp, u] = await Promise.all([params, searchParams, requireSeller()]);
  if (!isUuid(id)) notFound();
  const p = await q1<{ id: string; title: string; category_id: string; description: string; materials: string[]; price_paise: number; original_price_paise: number | null; weight_grams: number | null; length_mm: number | null; width_mm: number | null; height_mm: number | null; processing_days: number; is_custom: boolean; moods: string[]; one_of_a_kind: boolean; process_note: string | null; status: string; rejection_reason: string | null }>(
    "select * from products where id = $1 and seller_id = $2", [id, u.sellerId]);
  if (!p) notFound();
  const [cats, variants, images] = await Promise.all([
    q<{ id: string; name: string }>("select id, name from categories where active order by sort_order"),
    q<{ label: string; stock: number; price: number | null }>(`select v.label, (i.on_hand - i.reserved)::int stock, v.price_paise price from product_variants v join product_inventory i on i.variant_id = v.id where v.product_id = $1 and v.active order by v.label`, [id]),
    q<{ id: string; url: string }>("select id, url from product_images where product_id = $1 order by position", [id]),
  ]);
  const act = (op: string, text: string, danger = false) => <form action={productStatusAction}><input type="hidden" name="id" value={id} /><input type="hidden" name="op" value={op} /><button className={danger ? btnDanger : btn2}>{text}</button></form>;
  return (
    <>
      <PageTitle title={p.title} action={<Badge color={statusColor(p.status)}>{label(p.status)}</Badge>} /><Flash {...sp} />
      {p.status === "rejected" && <Flash err={`Not approved: ${p.rejection_reason ?? "please review the listing"}. Edit it and submit again.`} />}
      {p.status === "pending_approval" && <p className="mb-4 text-sm text-muted">Waiting for admin review.</p>}
      <div className="mb-6 flex flex-wrap gap-3">
        {["draft", "rejected"].includes(p.status) && act("submit", "Submit for approval")}
        {p.status === "approved" && act("pause", "Pause listing")}
        {p.status === "paused" && <form action={resumeProductAction}><input type="hidden" name="id" value={id} /><button className={btn2}>Resume listing</button></form>}
        {act("archive", "Archive", true)}
      </div>
      <ProductForm cats={cats} p={{ id, title: p.title, categoryId: p.category_id, description: p.description, materials: p.materials, price: p.price_paise, originalPrice: p.original_price_paise, weight: p.weight_grams, length: p.length_mm, width: p.width_mm, height: p.height_mm, processingDays: p.processing_days, isCustom: p.is_custom, moods: p.moods, oneOfAKind: p.one_of_a_kind, processNote: p.process_note, variants, images }} />
    </>
  );
}
