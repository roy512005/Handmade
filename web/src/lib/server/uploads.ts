import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { storageRoot } from "./storage";

const ROOT = process.env.UPLOAD_DIR ?? storageRoot();
const PUBLIC_DIR = path.join(ROOT, "uploads");
const PRIVATE_DIR = path.join(ROOT, "private");
export const MAX_BYTES = 4 * 1024 * 1024;

/** Detect type from magic bytes — never trust the client's filename or MIME type. */
function sniff(b: Buffer): { ext: string; mime: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (b.length > 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return { ext: "webp", mime: "image/webp" };
  if (b.length > 4 && b.subarray(0, 4).toString() === "%PDF") return { ext: "pdf", mime: "application/pdf" };
  return null;
}

export async function saveUpload(file: File, opts: { isPrivate?: boolean; allowPdf?: boolean }): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  if (!file || file.size === 0) return { ok: false, error: "No file." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File is too large (max 4 MB)." };
  const buf = Buffer.from(await file.arrayBuffer());
  const t = sniff(buf);
  if (!t || (t.ext === "pdf" && !opts.allowPdf)) return { ok: false, error: opts.allowPdf ? "Upload a JPG, PNG, WebP or PDF." : "Upload a JPG, PNG or WebP image." };
  const dir = opts.isPrivate ? PRIVATE_DIR : PUBLIC_DIR;
  fs.mkdirSync(dir, { recursive: true });
  const name = `${randomUUID()}.${t.ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return { ok: true, name };
}

export function readUpload(name: string, isPrivate: boolean): { data: Buffer; mime: string } | null {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|pdf)$/.test(name)) return null;
  const p = path.join(isPrivate ? PRIVATE_DIR : PUBLIC_DIR, name);
  if (!fs.existsSync(p)) return null;
  const data = fs.readFileSync(p);
  return { data, mime: sniff(data)?.mime ?? "application/octet-stream" };
}
