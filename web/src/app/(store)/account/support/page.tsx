import { getUser } from "@/lib/server/auth";
import { q } from "@/lib/server/db";
import { supportTicketAction } from "@/app/actions/account";
import { Badge, btn, card, Field, Flash, label, PageTitle, statusColor } from "@/components/ui";

export const metadata = { title: "Help & support" };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ err?: string; msg?: string }> }) {
  const sp = await searchParams;
  const user = (await getUser())!;
  const tickets = await q<{ id: string; subject: string; status: string; created_at: string }>("select id, subject, status, created_at from support_tickets where user_id = $1 order by created_at desc", [user.id]);
  return (
    <><PageTitle title="Help & support" sub="Problem with an order? Tell us and we'll sort it out." /><Flash {...sp} />
      <form action={supportTicketAction} className={`${card} max-w-lg space-y-4`}>
        <Field label="Order number (optional)" name="order" placeholder="ORD-1001" /><Field label="Subject" name="subject" required /><Field label="Message" name="body" rows={4} required />
        <button className={btn}>Send</button></form>
      {tickets.length > 0 && <><h2 className="mb-3 mt-8 text-2xl">Your requests</h2><ul className="space-y-2">{tickets.map((t) => <li key={t.id} className={`${card} flex justify-between text-sm`}><span>{t.subject}</span><Badge color={statusColor(t.status)}>{label(t.status)}</Badge></li>)}</ul></>}</>
  );
}
