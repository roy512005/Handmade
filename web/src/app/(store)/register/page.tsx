import Link from "next/link";
import { registerBuyer } from "@/app/actions/auth";
import { btn, card, Field, Flash } from "@/components/ui";

export const metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ err?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl text-forest">Create your account</h1>
      <form action={registerBuyer} className={`${card} mt-6 space-y-4`}>
        <Flash err={sp.err} />
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <Field label="Full name" name="name" required />
        <Field label="Email" name="email" type="email" required />
        <Field label="Password" name="password" type="password" required hint="At least 8 characters." />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="marketing" className="mt-1" /> Send me occasional news about new makers and collections.</label>
        <button className={`${btn} w-full`}>Create account</button>
        <p className="text-center text-sm text-muted">Already have an account? <Link href="/login" className="text-forest underline">Sign in</Link></p>
      </form>
    </div>
  );
}
