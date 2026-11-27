import Link from "next/link";
import { choosePassword } from "@/app/actions/auth";
import { btn, card, Field, Flash } from "@/components/ui";

// the token is in the URL, so never leak it through the Referer header
export const metadata = { title: "Choose a new password", referrer: "no-referrer" as const };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ err?: string; token?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-4xl text-forest">Choose a new password</h1>
      <form action={choosePassword} className={`${card} mt-6 space-y-4`}>
        <Flash err={sp.err} />
        <input type="hidden" name="token" value={sp.token ?? ""} />
        <Field label="New password" name="password" type="password" required hint="At least 8 characters." />
        <button className={`${btn} w-full`}>Save password</button>
        <p className="text-center text-sm text-muted"><Link href="/forgot-password" className="text-forest underline">Request a new link</Link></p>
      </form>
    </div>
  );
}
