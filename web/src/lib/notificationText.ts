import { formatINR } from "./money";

export function describeNotification(type: string, p: Record<string, unknown>): string {
  const sub = String(p.suborder ?? p.order ?? "");
  const m: Record<string, string> = {
    payment_confirmed: `Payment confirmed for order ${sub}. The makers have been notified.`,
    new_order: `New order ${sub} — please accept it and start preparing.`,
    order_accepted: `The maker accepted ${sub}.`,
    order_preparing: `Your maker is preparing ${sub}.`,
    order_ready_for_pickup: `${sub} is packed and waiting for the courier.`,
    shipment_picked_up: `${sub} was picked up by the courier.`,
    shipment_in_transit: `${sub} is on its way.`,
    shipment_out_for_delivery: `${sub} is out for delivery today.`,
    shipment_delivered: `${sub} was delivered. We'd love a review!`,
    shipment_delivery_failed: `Delivery attempt failed for ${sub}.`,
    delivery_failed: `Delivery failed for ${sub} — needs attention.`,
    order_cancelled: `${sub} was cancelled${p.by ? ` by the ${p.by}` : ""}.`,
    refund_processed: `Refund of ${formatINR(Number(p.amount_paise ?? 0))} processed for ${sub}.`,
    return_requested: `Return requested for ${sub}.`,
    return_approved: `Your return for ${sub} was approved.`,
    return_rejected: `Your return request for ${sub} wasn't approved.`,
    settlement_paid: `Settlement of ${formatINR(Number(p.amount_paise ?? 0))} has been paid to your bank account.`,
    new_seller_application: `New seller application: ${p.brand}.`,
    new_product_submission: `New product awaiting approval: ${p.title}.`,
    product_approved: `Your product "${p.title}" was approved and is now live.`,
    product_rejected: `Your product "${p.title}" was not approved. ${p.reason ?? ""}`,
    seller_approved: "Your seller account is approved — you can now list products!",
    seller_rejected: `Your seller application wasn't approved. ${p.reason ?? ""}`,
    seller_suspended: "Your seller account has been suspended. Contact support.",
    low_stock: `Low stock: "${p.title}" has ${p.left} left.`,
    followed_new_product: `${p.brand} just added "${p.title}".`,
    price_drop: `"${p.title}" on your wishlist is now ${formatINR(Number(p.price_paise ?? 0))} (was ${formatINR(Number(p.was_paise ?? 0))}).`,
    back_in_stock: `"${p.title}" on your wishlist is back in stock.`,
    payment_failed: "A payment failed.",
    customer_complaint: `Support request: ${p.subject}`,
  };
  return m[type] ?? type.replace(/_/g, " ");
}
