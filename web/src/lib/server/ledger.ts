import { q, q1, tx, type Queryable } from "./db";
import { getSettings } from "./settings";
import { notifySeller } from "./notify";

/** Move pending entries to available once the return window after delivery has passed. */
export async function releaseDueLedger() {
  const { returnWindowDays } = await getSettings();
  await q(
    `update seller_ledger_entries e set status = 'available'
     where e.status = 'pending' and e.suborder_id in (
       select id from seller_suborders
       where status = 'delivered' and delivered_at is not null
         and delivered_at + ($1 || ' days')::interval <= now())`, [String(returnWindowDays)]);
  // reversals recorded against already-released sales stay available; reversals of pending sales net out pending.
}

export type Balances = { pending: number; available: number; settled: number; gross: number; commission: number; refunds: number };

export async function sellerBalances(sellerId: string): Promise<Balances> {
  const r = await q1<Balances>(
    `select
       coalesce(sum(amount_paise) filter (where status = 'pending'), 0) pending,
       coalesce(sum(amount_paise) filter (where status = 'available'), 0) available,
       coalesce(sum(amount_paise) filter (where status = 'settled'), 0) settled,
       coalesce(sum(amount_paise) filter (where entry_type = 'sale'), 0) gross,
       coalesce(-sum(amount_paise) filter (where entry_type in ('commission','commission_reversal')), 0) commission,
       coalesce(-sum(amount_paise) filter (where entry_type = 'refund_reversal'), 0) refunds
     from seller_ledger_entries where seller_id = $1`, [sellerId]);
  return r!;
}

export async function sellerLedger(sellerId: string, limit = 100) {
  return q<{ id: string; entry_type: string; amount_paise: number; status: string; created_at: string; suborder_number: string | null }>(
    `select e.id, e.entry_type, e.amount_paise, e.status, e.created_at, so.suborder_number
     from seller_ledger_entries e left join seller_suborders so on so.id = e.suborder_id
     where e.seller_id = $1 order by e.created_at desc limit ${limit}`, [sellerId]);
}

export async function settleSeller(sellerId: string): Promise<{ ok: boolean; amount?: number; error?: string }> {
  await releaseDueLedger();
  return tx(async (db) => {
    const sum = (await q1<{ s: number }>(
      "select coalesce(sum(amount_paise),0) s from seller_ledger_entries where seller_id = $1 and status = 'available'", [sellerId], db))!.s;
    if (sum <= 0) return { ok: false, error: "Nothing available to settle." };
    const bank = await q1("select 1 from seller_bank_accounts where seller_id = $1", [sellerId], db);
    if (!bank) return { ok: false, error: "Seller has no bank account on file." };
    const st = await q1<{ id: string }>(
      "insert into settlements (seller_id, amount_paise, status, provider_ref, paid_at) values ($1,$2,'paid',$3, now()) returning id",
      [sellerId, sum, "mockpayout_" + Date.now()], db);
    await q("update seller_ledger_entries set status = 'settled', settlement_id = $2 where seller_id = $1 and status = 'available'", [sellerId, st!.id], db);
    await notifySeller(sellerId, "settlement_paid", { amount_paise: sum }, db);
    return { ok: true, amount: sum };
  });
}

export async function listSettlements(sellerId?: string) {
  return q<{ id: string; seller_id: string; brand_name: string; amount_paise: number; status: string; created_at: string }>(
    `select st.id, st.seller_id, s.brand_name, st.amount_paise, st.status, st.created_at
     from settlements st join seller_profiles s on s.id = st.seller_id
     ${sellerId ? "where st.seller_id = $1" : ""} order by st.created_at desc limit 100`, sellerId ? [sellerId] : []);
}

export async function writeLedger(db: Queryable, e: { sellerId: string; suborderId: string; type: string; amount: number; status?: string; ref?: string }) {
  await q(
    "insert into seller_ledger_entries (seller_id, suborder_id, entry_type, amount_paise, status, reference) values ($1,$2,$3,$4,$5,$6)",
    [e.sellerId, e.suborderId, e.type, e.amount, e.status ?? "pending", e.ref ?? null], db);
}
