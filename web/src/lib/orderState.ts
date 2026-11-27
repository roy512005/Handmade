/** Pure order state machine — shared by server code and tests. */
export type SubStatus =
  | "placed" | "payment_confirmed" | "accepted" | "preparing" | "ready_for_pickup"
  | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "delivery_failed"
  | "cancellation_requested" | "cancelled" | "return_requested" | "return_in_progress" | "refunded";

const T: Record<SubStatus, SubStatus[]> = {
  placed: ["payment_confirmed", "cancelled"],
  payment_confirmed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"],
  ready_for_pickup: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "delivery_failed"],
  in_transit: ["out_for_delivery", "delivered", "delivery_failed"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivery_failed: ["out_for_delivery", "refunded"],
  delivered: ["return_requested"],
  cancellation_requested: ["cancelled"],
  return_requested: ["return_in_progress", "delivered"],
  return_in_progress: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

export function canTransition(from: SubStatus, to: SubStatus): boolean {
  return T[from]?.includes(to) ?? false;
}

export const STATUS_LABEL: Record<SubStatus, string> = {
  placed: "Order placed",
  payment_confirmed: "Payment confirmed",
  accepted: "Accepted by maker",
  preparing: "Maker is preparing your order",
  ready_for_pickup: "Ready for pickup",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  delivery_failed: "Delivery failed",
  cancellation_requested: "Cancellation requested",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  return_in_progress: "Return in progress",
  refunded: "Refunded",
};

/** Buyer can cancel until the courier has the parcel. */
export const BUYER_CANCELLABLE: SubStatus[] = ["payment_confirmed", "accepted", "preparing", "ready_for_pickup"];

export function parentStatus(subs: SubStatus[]): "placed" | "payment_confirmed" | "cancelled" | "completed" | "refunded" {
  if (subs.length === 0) return "placed";
  if (subs.every((s) => s === "refunded")) return "refunded";
  if (subs.every((s) => s === "cancelled" || s === "refunded")) return "cancelled";
  if (subs.every((s) => ["delivered", "cancelled", "refunded"].includes(s))) return "completed";
  if (subs.every((s) => s === "placed")) return "placed";
  return "payment_confirmed";
}

/** Map a courier status string to an internal status. */
export function fromCourier(s: string): SubStatus | null {
  switch (s) {
    case "picked_up": return "picked_up";
    case "in_transit": return "in_transit";
    case "out_for_delivery": return "out_for_delivery";
    case "delivered": return "delivered";
    case "delivery_failed": return "delivery_failed";
    default: return null;
  }
}
