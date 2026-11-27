---
name: shipping-tracking
description: Courier aggregator integration (Shiprocket or similar), shipment creation, labels, pickup, tracking webhooks and failure handling.
---

# Shipping & Tracking

## Responsibilities
Platform: calculate shipping, create shipment per suborder, generate label, request pickup, ingest tracking, notify buyer + seller.
Seller: accurate weight/dimensions, safe packing, package ready at pickup address.

## Flow
Suborder accepted → seller marks packed/ready → platform checks serviceability (pickup PIN → delivery PIN) → create shipment → store AWB, courier, label URL → request pickup → webhooks update `shipments` + append `shipment_events` → map courier status to internal suborder status.

## Rules
- Check serviceability before accepting an order and again before shipment creation. If unserviceable, block and show alternative workflow (e.g. seller self-ship with manual tracking, or cancel/refund).
- Shipping rate estimated at cart/checkout from weight (volumetric vs dead) and PINs.
- Verify webhook authenticity; handle duplicates and out-of-order events; keep a raw event log.
- Never expose full buyer address to anyone but the fulfilling seller and admin; labels carry what couriers need.
- Failed pickup / delivery failed / RTO → admin queue + notifications; refund or reship per policy.
- One shipment per suborder; tracking shown grouped under the parent order.

## Status mapping (internal)
ready_for_pickup, picked_up, in_transit, out_for_delivery, delivered, delivery_failed, rto_initiated, rto_delivered.
