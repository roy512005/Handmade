import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { q1, tx } from "./db";
import { demoMode, webhookSecret } from "./env";
import { onPaymentCaptured, onPaymentFailed } from "./orders";

/**
 * Payment gateway adapter (mock "MockPay"). A real gateway (Razorpay/Cashfree marketplace)
 * would create an order here and POST signed webhooks to /api/webhooks/payment.
 * Only the signed webhook path may confirm payment — never the browser redirect.
 */
export const sign = (body: string) => createHmac("sha256", webhookSecret()).update(body).digest("hex");
export function verifySignature(body: string, sig: string | null): boolean {
  if (!sig) return false;
  const a = Buffer.from(sign(body)), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
export const newProviderPaymentId = () => "mp_" + randomBytes(8).toString("hex");

export type PaymentEvent = { id: string; type: "payment.captured" | "payment.failed"; payment_id: string };

/** Idempotent: the same event id is processed once. Returns what happened. */
export async function processPaymentEvent(ev: PaymentEvent): Promise<"processed" | "duplicate" | "unknown_payment"> {
  return tx(async (db) => {
    const pay = await q1<{ id: string; status: string }>("select id, status from payments where provider_payment_id = $1", [ev.payment_id], db);
    if (!pay) return "unknown_payment";
    const ins = await q1<{ id: string }>(
      `insert into payment_events (provider, provider_event_id, payment_id, payload) values ('mockpay',$1,$2,$3)
       on conflict (provider, provider_event_id) do nothing returning id`, [ev.id, pay.id, JSON.stringify(ev)], db);
    if (!ins) return "duplicate";
    if (ev.type === "payment.captured") await onPaymentCaptured(pay.id, db);
    else await onPaymentFailed(pay.id, db);
    await db.query("update payment_events set processed_at = now() where id = $1", [ins.id]);
    return "processed";
  });
}

/** Called by the mock hosted payment page to emulate the gateway posting a signed webhook. */
export async function simulateGatewayEvent(providerPaymentId: string, type: PaymentEvent["type"]) {
  if (!demoMode()) throw new Error("Mock payments are disabled.");
  const body = JSON.stringify({ id: `evt_${randomBytes(6).toString("hex")}`, type, payment_id: providerPaymentId });
  return handleWebhook(body, sign(body));
}

export async function handleWebhook(rawBody: string, signature: string | null) {
  if (!verifySignature(rawBody, signature)) return { status: 401 as const, body: "bad signature" };
  let ev: PaymentEvent;
  try { ev = JSON.parse(rawBody); } catch { return { status: 400 as const, body: "bad json" }; }
  if (!ev?.id || !ev?.payment_id || !["payment.captured", "payment.failed"].includes(ev.type)) return { status: 400 as const, body: "bad event" };
  const r = await processPaymentEvent(ev);
  return { status: 200 as const, body: r };
}
