import { getUser, can } from "@/lib/server/auth";
import { q1 } from "@/lib/server/db";
import { readUpload } from "@/lib/server/uploads";

/** Private seller documents: admins with seller permission, or the owning seller. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const id = (await params).id;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const d = await q1<{ storage_path: string; seller_id: string }>("select storage_path, seller_id from seller_documents where id = $1", [id]);
  if (!d) return new Response("Not found", { status: 404 });
  if (!(user.isAdmin && can(user, "sellers")) && user.sellerId !== d.seller_id) return new Response("Forbidden", { status: 403 });
  const f = readUpload(d.storage_path, true);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
