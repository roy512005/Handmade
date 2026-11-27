import { handleWebhook } from "@/lib/server/payments";

/** Gateway → us. The body must carry a valid HMAC signature in `x-signature`. */
export async function POST(req: Request) {
  const raw = await req.text();
  const r = await handleWebhook(raw, req.headers.get("x-signature"));
  return new Response(r.body, { status: r.status });
}
