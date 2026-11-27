import os from "node:os";
import path from "node:path";

/**
 * Where the embedded database and uploads live when DATA_DIR / UPLOAD_DIR aren't set.
 * Vercel's app folder is read-only, so only the temp folder works there. It is NOT durable:
 * each instance has its own copy and loses it when recycled. Preview use only, until the
 * database and file storage are hosted.
 */
export function storageRoot(): string {
  return process.env.VERCEL ? path.join(os.tmpdir(), "handmade") : path.join(process.cwd(), ".data");
}
