import { notFound, redirect } from "next/navigation";
import { demoMode } from "@/lib/server/env";
import { requireUser } from "@/lib/server/auth";
import { q1 } from "@/lib/server/db";
import { formatINR } from "@/lib/money";
import { mockPayAction } from "@/app/actions/shop";
import { btn, btnDanger, card } from "@/components/ui";

export const metadata = { title: "Secure payment" };

export default async function PayPage({ params }: { params: Promise<{ order: string }> }) {
  if (!demoMode()) notFound();
  const { order } = await params;
  const user = await requireUser(`/pay/${order}`);
  const o = await q1<{ total_paise: number; status: string }>("select total_paise, status from parent_orders where order_number = $1 and buyer_id = $2", [order, user.id]);
  if (!o) notFound();
  if (o.status !== "placed") redirect(`/account/orders/${order}`);
  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className={card}>
        <p className="text-xs uppercase tracking-wide text-terracotta">MockPay · test mode</p>
        <h1 className="mt-1 text-3xl text-forest">Pay {formatINR(o.total_paise)}</h1>
        <p className="mt-1 text-sm text-muted">Order {order}. This page stands in for a real payment gateway (UPI / cards / net banking). The result is delivered to the server as a signed webhook.</p>
        <form action={mockPayAction} className="mt-6 space-y-3"><input type="hidden" name="order" value={order} />
          <button name="result" value="success" className={`${btn} w-full`}>Simulate successful payment</button>
          <button name="result" value="fail" className={`${btnDanger} w-full`}>Simulate failed payment</button></form>
      </div>
    </div>
  );
}
