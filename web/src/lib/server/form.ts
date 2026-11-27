import { redirect } from "next/navigation";
import type { z } from "zod";

/** Redirect back with a flash message in the query string. */
export function go(path: string, flash?: { err?: string; msg?: string }): never {
  if (!flash) redirect(path);
  const u = new URL(path, "http://x");
  if (flash.err) u.searchParams.set("err", flash.err);
  if (flash.msg) u.searchParams.set("msg", flash.msg);
  redirect(u.pathname + u.search);
}

export function parseForm<S extends z.ZodType>(schema: S, fd: FormData): { ok: true; data: z.infer<S> } | { ok: false; error: string } {
  const r = schema.safeParse(Object.fromEntries(fd));
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error.issues[0]?.message ?? "Please check the form." };
}

/** Only allow same-site relative redirects. */
export function safeNext(next: unknown, fallback = "/"): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
