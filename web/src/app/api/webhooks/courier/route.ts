import { z } from "zod";
import { verifySignature } from "@/lib/server/payments";
import { applyCourierEvent } from "@/lib/server/orders";

const schema = z.object({ id: z.string().min(1), awb: z.string().min(3), status: z.string(), location: z.string().default("") });

/** Courier → us. Signed like the payment webhook; duplicate/out-of-order events are ignored safely. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-signature"))) return new Response("bad signature", { status: 401 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return new Response("bad json", { status: 400 }); }
  const p = schema.safeParse(body);
  if (!p.success) return new Response("bad event", { status: 400 });
  const r = await applyCourierEvent(p.data.awb, p.data.status, p.data.location, p.data.id);
  return new Response(r, { status: r === "unknown_shipment" ? 404 : 200 });
}
