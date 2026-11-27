import { q, type Queryable } from "./db";

export type Settings = {
  commissionBps: number; returnWindowDays: number; shippingBase: number; shippingPer500g: number; freeShippingOver: number;
};

export async function getSettings(db?: Queryable): Promise<Settings> {
  const rows = await q<{ key: string; value: string }>("select key, value from settings", [], db);
  const m = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  return {
    commissionBps: m.default_commission_bps ?? 1200,
    returnWindowDays: m.return_window_days ?? 7,
    shippingBase: m.shipping_base_paise ?? 6000,
    shippingPer500g: m.shipping_per_500g_paise ?? 3000,
    freeShippingOver: m.free_shipping_over_paise ?? 0,
  };
}
