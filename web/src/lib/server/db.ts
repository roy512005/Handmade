import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";

/**
 * Database access. Embedded Postgres (PGlite) so the app runs with zero setup.
 * Everything goes through q()/tx() — swap this file for `pg`/Supabase to use a hosted Postgres.
 * Money columns are bigint paise; they are parsed to JS numbers (safe up to ~9e15 paise).
 */

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");
// 0003 uses Supabase's auth.uid(); it is not applied to the embedded database.
const SKIP = new Set(["0003_rls_supabase.sql"]);

/**
 * Embedded Postgres supports ONE process per data folder. Opening it from two servers
 * (e.g. `next dev` and `next start`) corrupts the catalog, so refuse with a clear message.
 */
function claimDataDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  const lock = path.join(dir, "..", "app.lock");
  if (fs.existsSync(lock)) {
    const pid = Number(fs.readFileSync(lock, "utf8"));
    if (pid && pid !== process.pid) {
      let alive = true;
      try { process.kill(pid, 0); } catch { alive = false; }
      if (alive) throw new Error(`Database folder ${dir} is already in use by process ${pid}. Stop that server, or set DATA_DIR to a different folder for this one.`);
    }
  }
  fs.writeFileSync(lock, String(process.pid));
  process.once("exit", () => { try { if (fs.readFileSync(lock, "utf8") === String(process.pid)) fs.unlinkSync(lock); } catch { /* already gone */ } });
}

export async function createDb(dataDir?: string): Promise<PGlite> {
  if (dataDir && !dataDir.startsWith("memory:")) claimDataDir(dataDir);
  const db = new PGlite(dataDir, {
    parsers: { 20: (v: string) => Number(v), 1700: (v: string) => Number(v) },
  });
  await db.waitReady;
  await db.exec(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz default now())",
  );
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    if (SKIP.has(f)) continue;
    const done = await db.query("select 1 from _migrations where name = $1", [f]);
    if (done.rows.length) continue;
    await db.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"));
    await db.query("insert into _migrations (name) values ($1)", [f]);
  }
  return db;
}

type Holder = { gen: string; db: Promise<PGlite> };
type G2 = typeof globalThis & { __hmDbCur?: Holder; __db?: Promise<PGlite>; __hmDb2?: Promise<PGlite> };
const g2 = globalThis as G2;

/** Changes whenever the set of migrations changes, so a hot-reloading dev server reconnects and migrates. */
let genMemo: { at: number; v: string } | undefined;
function generation(): string {
  if (genMemo && Date.now() - genMemo.at < 1500) return genMemo.v;
  const v = generationNow();
  genMemo = { at: Date.now(), v };
  return v;
}
function generationNow(): string {
  return fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort().map((f) => f + fs.statSync(path.join(MIGRATIONS_DIR, f)).size).join("|") + "|seed";
}

function getDb(): Promise<PGlite> {
  const gen = generation();
  const cur = g2.__hmDbCur;
  if (cur && cur.gen === gen) return cur.db;
  // Never leave two live instances on one data folder: close whatever was open before reconnecting.
  const old = [cur?.db, g2.__db, g2.__hmDb2].filter(Boolean) as Promise<PGlite>[];
  g2.__db = undefined; g2.__hmDb2 = undefined;
  const dir = process.env.DATA_DIR ?? path.join(process.cwd(), ".data", "pg");
  if (!dir.startsWith("memory:")) fs.mkdirSync(path.dirname(dir), { recursive: true });
  const db = Promise.all(old.map((o) => o.then((d) => d.close()).catch(() => undefined)))
    .then(() => createDb(dir))
    .then(async (d) => { const { seedIfEmpty } = await import("./seed"); await seedIfEmpty(d); return d; });
  g2.__hmDbCur = { gen, db };
  return db;
}

export type Queryable = {
  query: PGlite["query"];
};

/** Run one query; returns rows. */
export async function q<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  db?: Queryable,
): Promise<T[]> {
  const conn = db ?? (await getDb());
  const res = await conn.query<T>(sql, params);
  return res.rows;
}

export async function q1<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
  db?: Queryable,
): Promise<T | undefined> {
  return (await q<T>(sql, params, db))[0];
}

/** Run fn in a transaction. Pass `tx` as the last arg of q()/q1() inside. */
export async function tx<T>(fn: (t: Queryable) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (t) => fn(t as unknown as Queryable));
}
