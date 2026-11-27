import { describe, it, expect } from "vitest";
import { createDb } from "@/lib/server/db";
import { seedIfEmpty } from "@/lib/server/seed";

describe("schema", () => {
  it("applies all migrations and seeds", async () => {
    const db = await createDb(); // in-memory
    await seedIfEmpty(db);
    const r = await db.query<{ c: number }>("select count(*)::int c from products where status='approved'");
    expect(r.rows[0].c).toBeGreaterThanOrEqual(20);
    // generated artwork has three views; a product with a supplied photo has that one photo
    const odd = await db.query(
      `select p.title from products p left join product_images i on i.product_id = p.id and i.width is not null group by p.id
       having count(i.*) <> case when bool_or(i.url like '/products/%') then 1 else 3 end`);
    expect(odd.rows).toEqual([]);
    const ledger = await db.query("select 1 from pg_trigger where tgname='trg_ledger_immutable'");
    expect(ledger.rows.length).toBe(1);
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("data folder lock", () => {
  it("refuses a data folder that another live process is using", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "hm-lock-"));
    const dir = path.join(root, "pg");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(root, "app.lock"), String(process.ppid)); // a different, live process
    await expect(createDb(dir)).rejects.toThrow(/already in use by process/);
    fs.writeFileSync(path.join(root, "app.lock"), "999999"); // dead pid → stale lock is taken over
    const db = await createDb(dir);
    expect((await db.query("select 1 as x")).rows[0]).toEqual({ x: 1 });
    await db.close();
  });
});
