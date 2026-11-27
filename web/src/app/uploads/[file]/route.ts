import { readUpload } from "@/lib/server/uploads";

export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  const f = readUpload((await params).file, false);
  if (!f || f.mime === "application/pdf") return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(f.data), { headers: { "Content-Type": f.mime, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
}
