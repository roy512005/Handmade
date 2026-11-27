import { getUser } from "@/lib/server/auth";
import { q1 } from "@/lib/server/db";
import { updateProfileAction } from "@/app/actions/account";
import { btn, card, Field, Flash, PageTitle } from "@/components/ui";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ err?: string; msg?: string }> }) {
  const sp = await searchParams;
  const user = (await getUser())!;
  const row = await q1<{ phone: string | null }>("select phone from users where id = $1", [user.id]);
  return (
    <><PageTitle title="Profile" /><Flash {...sp} />
      <form action={updateProfileAction} className={`${card} max-w-md space-y-4`}>
        <Field label="Full name" name="name" defaultValue={user.name} required /><Field label="Mobile" name="phone" defaultValue={row?.phone} />
        <p className="text-sm text-muted">Email: {user.email}</p><button className={btn}>Save changes</button></form></>
  );
}
