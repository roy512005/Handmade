/* eslint-disable @next/next/no-img-element */
import { saveProductAction } from "@/app/actions/seller";
import { btn, card, Field, input } from "@/components/ui";
import { MOODS } from "@/lib/art";

export type ProductFormData = {
  id?: string; title?: string; categoryId?: string; description?: string; materials?: string[]; price?: number; originalPrice?: number | null;
  weight?: number | null; length?: number | null; width?: number | null; height?: number | null; processingDays?: number; isCustom?: boolean;
  variants?: { label: string; stock: number; price: number | null }[]; images?: { id: string; url: string }[];
  moods?: string[]; oneOfAKind?: boolean; processNote?: string | null;
};

const rupees = (p?: number | null) => (p ? String(p / 100) : "");
const cm = (mm?: number | null) => (mm ? String(mm / 10) : "");

export function ProductForm({ cats, p = {} }: { cats: { id: string; name: string }[]; p?: ProductFormData }) {
  return (
    <form action={saveProductAction} className={`${card} max-w-3xl space-y-4`}>
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <Field label="Title" name="title" defaultValue={p.title} required />
      <Field label="Category" name="categoryId" required>
        <select id="categoryId" name="categoryId" defaultValue={p.categoryId ?? ""} className={input} required><option value="" disabled>Choose…</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Description" name="description" rows={5} defaultValue={p.description} required hint="Tell the story: how it's made, what's special about it." />
      <Field label="Materials" name="materials" defaultValue={p.materials?.join(", ")} hint="Comma separated, e.g. Terracotta, Cotton wire" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Selling price (₹)" name="price" defaultValue={rupees(p.price)} required /><Field label="Original price (₹, optional)" name="originalPrice" defaultValue={rupees(p.originalPrice)} hint="Shows a discount if higher than the selling price." />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Packed weight (g)" name="weight" type="number" defaultValue={p.weight} required hint="Used to calculate shipping — be accurate." />
        <Field label="Length (cm)" name="length" defaultValue={cm(p.length)} /><Field label="Width (cm)" name="width" defaultValue={cm(p.width)} /><Field label="Height (cm)" name="height" defaultValue={cm(p.height)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Processing time (days)" name="processingDays" type="number" defaultValue={p.processingDays ?? 3} required />
        <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="isCustom" defaultChecked={p.isCustom} /> Made to order / customisable</label>
      </div>
      <Field label="How it's made (optional)" name="processNote" rows={3} defaultValue={p.processNote} hint="A few lines about your process. Buyers love this." />
      <fieldset><legend className="mb-1 text-sm font-medium">Mood</legend>
        <div className="flex flex-wrap gap-3 text-sm">{MOODS.map((m) => <label key={m.key} className="flex items-center gap-2"><input type="checkbox" name="moods" value={m.key} defaultChecked={p.moods?.includes(m.key)} /> {m.label}</label>)}</div>
        <p className="mt-1 text-xs text-muted">Helps buyers find your piece when browsing by mood.</p></fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="oneOfAKind" defaultChecked={p.oneOfAKind} /> This is a one-of-a-kind piece (only one exists)</label>
      <Field label="Options & stock" name="variants" rows={4} required
        defaultValue={(p.variants ?? [{ label: "Default", stock: 1, price: null }]).map((v) => `${v.label} | ${v.stock}${v.price ? ` | ${v.price / 100}` : ""}`).join("\n")}
        hint="One line per option: Label | stock | optional price. e.g. “Indigo / Large | 8 | 1299”. Use a single “Default” line if there are no options." />
      {p.images && p.images.length > 0 && <fieldset><legend className="mb-1 text-sm font-medium">Current photos</legend>
        <div className="flex flex-wrap gap-3">{p.images.map((im) => <label key={im.id} className="text-xs"><img src={im.url} alt="" className="h-20 w-20 rounded-control object-cover" /><span className="mt-1 flex items-center gap-1"><input type="checkbox" name="removeImage" value={im.id} /> Remove</span></label>)}</div></fieldset>}
      <Field label="Add photos" name="images" hint="JPG, PNG or WebP, up to 4 MB each. The first photo is the cover.">
        <input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className={input} /></Field>
      <button className={btn}>{p.id ? "Save changes" : "Save as draft"}</button>
    </form>
  );
}
