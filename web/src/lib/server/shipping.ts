import { randomBytes } from "node:crypto";
import { q, q1, type Queryable } from "./db";
import { getSettings } from "./settings";

/** Shipping for one seller's parcel. weight in grams (min 100g). */
export function shippingFor(weightGrams: number, subtotal: number, s: { shippingBase: number; shippingPer500g: number; freeShippingOver: number }): number {
  if (s.freeShippingOver > 0 && subtotal >= s.freeShippingOver) return 0;
  const w = Math.max(100, weightGrams);
  const extra = Math.max(0, Math.ceil((w - 500) / 500));
  return s.shippingBase + extra * s.shippingPer500g;
}

/**
 * Courier adapter (mock). Replace `createShipment` / `isServiceable` with Shiprocket calls.
 * Demo rule: delivery PIN codes starting with "99" are not serviceable.
 */
export function isServiceable(deliveryPin: string, pickupPin?: string): boolean {
  void pickupPin;
  return /^[1-9][0-9]{5}$/.test(deliveryPin) && !deliveryPin.startsWith("99");
}

export async function createShipment(suborderId: string, db?: Queryable) {
  const existing = await q1<{ id: string; awb: string }>("select id, awb from shipments where suborder_id = $1", [suborderId], db);
  if (existing) return existing;
  const awb = "HM" + randomBytes(5).toString("hex").toUpperCase();
  const [row] = await q<{ id: string; awb: string }>(
    `insert into shipments (suborder_id, courier, awb, label_url, status)
     values ($1,'MockCourier',$2,$3,'pickup_scheduled') returning id, awb`,
    [suborderId, awb, `/seller/orders/${suborderId}/label`], db);
  await q("insert into shipment_events (shipment_id, provider_event_id, status, location, occurred_at) values ($1,$2,'pickup_scheduled','Seller pickup address', now())",
    [row.id, `${awb}-0`], db);
  return row;
}

export { getSettings };
