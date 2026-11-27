import { getUser } from "@/lib/server/auth";
import { getPrefs } from "@/lib/server/social";
import { savePreferencesAction } from "@/app/actions/social";
import { btn, card, Flash, PageTitle } from "@/components/ui";

export const metadata = { title: "Notification preferences" };

export default async function Preferences({ searchParams }: { searchParams: Promise<{ err?: string; msg?: string }> }) {
  const sp = await searchParams;
  const user = (await getUser())!;
  const p = await getPrefs(user.id);
  const row = (name: string, title: string, text: string, on: boolean) => (
    <label className="flex items-start gap-3 border-b border-line py-4 last:border-0"><input type="checkbox" name={name} defaultChecked={on} className="mt-1 h-4 w-4" />
      <span><span className="block text-sm font-medium">{title}</span><span className="block text-sm text-muted">{text}</span></span></label>);
  return (
    <>
      <PageTitle title="Notification preferences" sub="You're in control. We only send what you ask for — no countdowns, no nagging." /><Flash {...sp} />
      <form action={savePreferencesAction} className={`${card} max-w-xl`}>
        {row("order_updates", "Order updates", "Payment, shipping and delivery updates for your orders.", p.order_updates)}
        {row("wishlist_alerts", "Wishlist alerts", "When something you saved drops in price or is back in stock.", p.wishlist_alerts)}
        {row("followed_artisans", "New from makers you follow", "When a maker you follow publishes a new piece.", p.followed_artisans)}
        {row("weekly_drops", "Weekly drops", "A short note when the new weekly collection goes live. Off unless you turn it on.", p.weekly_drops)}
        <button className={`${btn} mt-4`}>Save preferences</button>
        <p className="mt-3 text-xs text-muted">In-app notifications only for now. Email and SMS aren&apos;t connected in this demo.</p>
      </form>
    </>
  );
}
