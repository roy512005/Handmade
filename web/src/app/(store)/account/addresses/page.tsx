import { getUser } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { deleteAddressAction, saveAddressAction } from "@/app/actions/shop";
import { btn, btnDanger, btnSm, card, Field, Flash, PageTitle } from "@/components/ui";

export const metadata = { title: "Saved addresses" };

export default async function AddressesPage({ searchParams }: { searchParams: Promise<{ err?: string; msg?: string }> }) {
  const sp = await searchParams;
  const user = (await getUser())!;
  const rows = await q<{ id: string; name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string }>(
    "select id, name, phone, line1, line2, city, state, pincode from addresses where user_id = $1 and kind = 'shipping' order by created_at", [user.id]);
  return (
    <>
      <PageTitle title="Saved addresses" /><Flash {...sp} />
      <ul className="grid gap-4 sm:grid-cols-2">{rows.map((a) => <li key={a.id} className={`${card} text-sm`}><b>{a.name}</b> · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} {a.pincode}
        <form action={deleteAddressAction} className="mt-3"><input type="hidden" name="id" value={a.id} /><button className={`${btnDanger} ${btnSm}`}>Delete</button></form></li>)}</ul>
      <form action={saveAddressAction} className={`${card} mt-6 grid gap-3 sm:grid-cols-2`}><h2 className="text-xl sm:col-span-2">Add an address</h2>
        <Field label="Full name" name="name" required /><Field label="Mobile" name="phone" required />
        <div className="sm:col-span-2"><Field label="Address" name="line1" required /></div><div className="sm:col-span-2"><Field label="Apartment, landmark" name="line2" /></div>
        <Field label="City" name="city" required /><Field label="State" name="state" required /><Field label="PIN code" name="pincode" required />
        <div className="sm:col-span-2"><button className={btn}>Save address</button></div></form>
    </>
  );
}
