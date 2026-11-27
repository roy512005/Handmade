import Link from "next/link";
import { login } from "@/app/actions/auth";
import { btn, card, Field, Flash } from "@/components/ui";
import { DEMO } from "@/lib/server/seed";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ err?: string; msg?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl text-forest">Sign in</h1>
      <form action={login} className={`${card} mt-6 space-y-4`}>
        <Flash err={sp.err} msg={sp.msg} />
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required />
        <button className={`${btn} w-full`}>Sign in</button>
        <p className="text-center text-sm"><Link href="/forgot-password" className="text-forest underline">Forgot password?</Link></p>
        <p className="text-center text-sm text-muted">New here? <Link href={`/register${sp.next ? `?next=${encodeURIComponent(sp.next)}` : ""}`} className="text-forest underline">Create an account</Link> · <Link href="/sell" className="text-forest underline">Sell with us</Link></p>
      </form>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-6 rounded-card border border-dashed border-line p-4 text-xs text-muted">
          <p className="font-medium text-charcoal">Demo accounts (development only)</p>
          <p>Buyer: {DEMO.buyer.email} / {DEMO.buyer.password}</p>
          <p>Seller: {DEMO.seller.email} / {DEMO.seller.password}</p>
          <p>Admin: {DEMO.admin.email} / {DEMO.admin.password}</p>
        </div>
      )}
    </div>
  );
}
