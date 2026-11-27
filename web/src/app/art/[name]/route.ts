import { artSvg, ASPECTS, KINDS, MOODS, type Aspect, type Mood } from "@/lib/art";

/** /art/vase-12.svg?m=earthy&v=0&a=portrait — generated demo artwork. Inputs are whitelisted. */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const name = (await params).name.replace(/\.svg$/, "");
  const m = /^([a-z]+)-([a-z0-9]{1,24})$/.exec(name);
  if (!m || !(KINDS as readonly string[]).includes(m[1])) return new Response("Not found", { status: 404 });
  const u = new URL(req.url).searchParams;
  const mood = (MOODS.map((x) => x.key) as string[]).includes(u.get("m") ?? "") ? (u.get("m") as Mood) : "earthy";
  const aspect = u.get("a") && u.get("a")! in ASPECTS ? (u.get("a") as Aspect) : "portrait";
  const view = Math.min(2, Math.max(0, Number(u.get("v")) || 0));
  const letter = (u.get("l") ?? "").replace(/[^A-Za-z]/g, "").slice(0, 1);
  return new Response(artSvg(m[1], m[2], mood, view, aspect, letter), {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" },
  });
}
