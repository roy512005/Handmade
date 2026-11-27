import { requireSeller } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { updateSellerProfileAction, uploadDocumentAction } from "@/app/actions/seller";
import { btn, btn2, card, Field, Flash, input, label, PageTitle } from "@/components/ui";

export const metadata = { title: "Profile & documents" };

export default async function SellerProfile({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  const u = await requireSeller();
  const [p, addr, docs, bank] = await Promise.all([
    q1<{ brand_name: string; story: string | null; slug: string }>("select brand_name, story, slug from seller_profiles where id = $1", [u.sellerId]),
    q1<{ line1: string; city: string; state: string; pincode: string; phone: string }>("select line1, city, state, pincode, phone from addresses where seller_id = $1 and kind = 'pickup'", [u.sellerId]),
    q<{ id: string; doc_type: string; created_at: string }>("select id, doc_type, created_at from seller_documents where seller_id = $1 order by created_at desc", [u.sellerId]),
    q1<{ account_holder: string; account_last4: string; ifsc: string }>("select account_holder, account_last4, ifsc from seller_bank_accounts where seller_id = $1", [u.sellerId]),
  ]);
  return (
    <>
      <PageTitle title="Profile & documents" sub={`Your public page: /makers/${p?.slug}`} /><Flash {...sp} />
      <form action={updateSellerProfileAction} className={`${card} max-w-2xl space-y-4`}>
        <Field label="Brand name" name="brand" defaultValue={p?.brand_name} required />
        <Field label="Your story" name="story" rows={5} defaultValue={p?.story} hint="Shown on your public maker page. Tell buyers about your craft." />
        <Field label="Profile image" name="image"><input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className={input} /></Field>
        <h2 className="pt-2 text-xl">Pickup address &amp; contact</h2>
        <Field label="Mobile" name="phone" defaultValue={addr?.phone} required /><Field label="Address" name="line1" defaultValue={addr?.line1} required />
        <div className="grid gap-4 sm:grid-cols-3"><Field label="City" name="city" defaultValue={addr?.city} required /><Field label="State" name="state" defaultValue={addr?.state} required /><Field label="PIN code" name="pincode" defaultValue={addr?.pincode} required /></div>
        <button className={btn}>Save profile</button></form>
      <section className={`${card} mt-6 max-w-2xl`}><h2 className="text-xl">Verification documents</h2>
        <p className="mt-1 text-sm text-muted">Private — only you and our verification team can see these. JPG, PNG, WebP or PDF, up to 4 MB.</p>
        <ul className="mt-3 space-y-1 text-sm">{docs.map((d) => <li key={d.id}>{label(d.doc_type)} · uploaded {new Date(d.created_at).toLocaleDateString("en-IN")} · <a className="text-forest underline" href={`/admin/documents/${d.id}`} target="_blank" rel="noopener noreferrer">View</a></li>)}{docs.length === 0 && <li className="text-muted">Nothing uploaded yet.</li>}</ul>
        <form action={uploadDocumentAction} className="mt-4 flex flex-wrap items-end gap-3">
          <div><label htmlFor="type" className="mb-1 block text-sm font-medium">Document</label><select id="type" name="type" className={input}><option value="pan">PAN card</option><option value="id_proof">ID proof</option><option value="business_proof">Business proof</option><option value="bank_proof">Bank proof</option></select></div>
          <div><label htmlFor="file" className="mb-1 block text-sm font-medium">File</label><input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className={input} /></div>
          <button className={btn2}>Upload</button></form></section>
      {bank && <section className={`${card} mt-6 max-w-2xl text-sm`}><h2 className="text-xl">Payout account</h2><p className="mt-2">{bank.account_holder} · account ending {bank.account_last4} · {bank.ifsc}</p><p className="mt-1 text-xs text-muted">To change bank details, contact support (for your protection).</p></section>}
    </>
  );
}
