import Link from "next/link";
import { forgotPassword } from "@/app/actions/auth";
import { btn, card, Field, Flash } from "@/components/ui";

export const metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ err?: string; msg?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl text-forest">Forgot password</h1>
      <form action={forgotPassword} className={`${card} mt-6 space-y-4`}>
        <Flash err={sp.err} msg={sp.msg} />
        <Field label="Email" name="email" type="email" required />
        <button className={`${btn} w-full`}>Send reset link</button>
        <p className="text-center text-sm text-muted"><Link href="/login" className="text-forest underline">Back to sign in</Link></p>
      </form>
    </div>
  );
}
