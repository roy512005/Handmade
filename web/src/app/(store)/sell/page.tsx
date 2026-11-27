import { registerSeller } from "@/app/actions/auth";
import { btn, card, Field, Flash, input } from "@/components/ui";
import { getUser } from "@/lib/server/auth";
import Link from "next/link";

export const metadata = { title: "Sell on Handmade" };

export default async function SellPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const sp = await searchParams;
  const user = await getUser();
  if (user?.sellerId) return (
    <div className="mx-auto max-w-xl px-4 py-12"><h1 className="text-4xl text-forest">You&apos;re a seller</h1>
      <Link href="/seller" className={`${btn} mt-6`}>Go to seller dashboard</Link></div>);
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-4xl text-forest">Sell your handmade work</h1>
      <p className="mt-2 text-muted">Tell us about you and your craft. We review every application — approval usually takes 1–2 working days. We charge a simple commission on each sale, nothing upfront.</p>
      <form action={registerSeller} className={`${card} mt-6 space-y-4`}>
        <Flash err={sp.err} />
        <h2 className="text-xl">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" name="name" required />
          <Field label="Brand / business name" name="brand" required />
          <Field label="Email" name="email" type="email" required />
          <Field label="Mobile number" name="phone" required placeholder="10-digit number" />
          <Field label="Password" name="password" type="password" required hint="At least 8 characters." />
          <Field label="Seller type" name="sellerType" required>
            <select id="sellerType" name="sellerType" className={input} required>
              <option value="individual_artisan">Individual artisan</option>
              <option value="handmade_creator">Handmade creator</option>
              <option value="small_business">Small handmade business</option>
              <option value="registered_business">Registered business</option>
            </select>
          </Field>
        </div>
        <Field label="Business address" name="businessAddress" required rows={2} />
        <h2 className="pt-2 text-xl">Pickup address</h2>
        <p className="-mt-3 text-xs text-muted">Where the courier collects your parcels.</p>
        <Field label="Address" name="pickupLine1" required />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" name="pickupCity" required />
          <Field label="State" name="pickupState" required />
          <Field label="PIN code" name="pickupPin" required />
        </div>
        <h2 className="pt-2 text-xl">Tax &amp; payouts</h2>
        <Field label="PAN" name="pan" required placeholder="ABCDE1234F" hint="Needed for tax compliance. Only the last 4 characters are stored in our database." />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Account holder" name="holder" required />
          <Field label="Account number" name="account" required />
          <Field label="IFSC" name="ifsc" required />
        </div>
        <p className="text-xs text-muted">You&apos;ll upload ID and business proof from your dashboard after applying.</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="agree" className="mt-1" required /> I agree to the seller agreement and commission terms, and confirm my products are genuinely handmade.</label>
        <button className={`${btn} w-full`}>Submit application</button>
      </form>
    </div>
  );
}
