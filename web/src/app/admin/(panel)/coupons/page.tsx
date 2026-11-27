import { requireAdmin } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { listCoupons } from "@/lib/server/coupons";
import { formatINR } from "@/lib/money";
import { couponAction } from "@/app/actions/admin";
import { Badge, btn, btn2, btnSm, card, Field, Flash, input, PageTitle, Table, Td } from "@/components/ui";

export const metadata = { title: "Coupons" };

export default async function AdminCoupons({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin("coupons");
  const [coupons, cats, sellers] = await Promise.all([listCoupons(), q<{ id: string; name: string }>("select id, name from categories order by name"), q<{ id: string; brand_name: string }>("select id, brand_name from seller_profiles where status = 'approved' order by brand_name")]);
  return (
    <>
      <PageTitle title="Coupons" /><Flash {...sp} />
      <Table head={["Code", "Discount", "Min order", "Max discount", "Used", "Valid until", "Status", ""]} empty={coupons.length ? undefined : "No coupons."}>
        {coupons.map((c) => <tr key={c.id}><Td className="font-mono">{c.code}</Td><Td>{c.kind === "fixed" ? formatINR(c.value) : `${c.value}%`}{c.kind === "first_order" ? " (first order)" : ""}</Td><Td>{formatINR(c.min_order_paise)}</Td><Td>{c.max_discount_paise ? formatINR(c.max_discount_paise) : "—"}</Td>
          <Td>{c.used}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</Td><Td>{c.ends_at ? new Date(c.ends_at).toLocaleDateString("en-IN") : "—"}</Td><Td><Badge color={c.active ? "green" : "grey"}>{c.active ? "Active" : "Inactive"}</Badge></Td>
          <Td><form action={couponAction}><input type="hidden" name="op" value="toggle" /><input type="hidden" name="id" value={c.id} /><button className={`${btn2} ${btnSm}`}>{c.active ? "Deactivate" : "Activate"}</button></form></Td></tr>)}</Table>
      <form action={couponAction} className={`${card} mt-8 grid max-w-3xl gap-4 sm:grid-cols-3`}><h2 className="text-xl sm:col-span-3">New coupon</h2>
        <Field label="Code" name="code" required placeholder="DIWALI15" />
        <Field label="Type" name="kind"><select id="kind" name="kind" className={input}><option value="percent">Percentage (%)</option><option value="fixed">Fixed amount (₹)</option><option value="first_order">First-order (%)</option></select></Field>
        <Field label="Value" name="value" required hint="% or ₹ depending on type" />
        <Field label="Minimum order (₹)" name="min" /><Field label="Max discount (₹)" name="max" /><Field label="Total usage limit" name="limit" />
        <Field label="Uses per customer" name="perUser" defaultValue={1} /><Field label="Valid until" name="ends" type="date" />
        <Field label="Category (optional)" name="category"><select id="category" name="category" className={input}><option value="">All categories</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Seller (optional)" name="seller"><select id="seller" name="seller" className={input}><option value="">All sellers</option>{sellers.map((c) => <option key={c.id} value={c.id}>{c.brand_name}</option>)}</select></Field>
        <div className="sm:col-span-3"><button className={btn}>Create coupon</button></div></form>
    </>
  );
}
