"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import { addReview, buyerCancel, requestReturn } from "@/lib/server/orders";
import { go, parseForm } from "@/lib/server/form";
import { q } from "@/lib/server/db";
import { notifyAdmins } from "@/lib/server/notify";

const order = z.string().regex(/^ORD-\d+$/);

export async function cancelSuborderAction(fd: FormData) {
  const user = await requireUser();
  const o = order.parse(fd.get("order"));
  const r = await buyerCancel(user.id, z.string().uuid().parse(fd.get("id")));
  revalidatePath("/account", "layout");
  go(`/account/orders/${o}`, r.ok ? { msg: "Order cancelled. Your refund has been initiated." } : { err: r.error });
}

export async function returnAction(fd: FormData) {
  const user = await requireUser();
  const o = order.parse(fd.get("order"));
  const reason = String(fd.get("reason") ?? "").trim();
  if (reason.length < 5) go(`/account/orders/${o}`, { err: "Please tell us what went wrong (a few words)." });
  const r = await requestReturn(user.id, z.string().uuid().parse(fd.get("id")), reason);
  go(`/account/orders/${o}`, r.ok ? { msg: "Return requested. We'll review it shortly." } : { err: r.error });
}

export async function reviewAction(fd: FormData) {
  const user = await requireUser();
  const o = order.parse(fd.get("order"));
  const p = parseForm(z.object({ itemId: z.string().uuid(), rating: z.coerce.number().int().min(1, "Choose a rating.").max(5), body: z.string().trim().max(2000).optional() }), fd);
  if (!p.ok) go(`/account/orders/${o}`, { err: p.error });
  const r = await addReview(user.id, p.data.itemId, p.data.rating, p.data.body ?? "");
  go(`/account/orders/${o}`, r.ok ? { msg: "Thanks for your review!" } : { err: r.error });
}

export async function updateProfileAction(fd: FormData) {
  const user = await requireUser("/account/profile");
  const p = parseForm(z.object({ name: z.string().trim().min(2, "Enter your name."), phone: z.string().trim().regex(/^([6-9]\d{9})?$/, "Enter a valid 10-digit mobile number.") }), fd);
  if (!p.ok) go("/account/profile", { err: p.error });
  await q("update users set full_name = $2, phone = $3 where id = $1", [user.id, p.data.name, p.data.phone || null]);
  go("/account/profile", { msg: "Profile updated." });
}

export async function markNotificationsRead(fd: FormData) {
  const user = await requireUser("/account/notifications");
  await q("update notifications set read_at = now() where user_id = $1 and read_at is null", [user.id]);
  revalidatePath("/", "layout");
  const back = String(fd.get("back") ?? "");
  go(["/account/notifications", "/seller/notifications", "/admin/notifications"].includes(back) ? back : "/account/notifications");
}

export async function supportTicketAction(fd: FormData) {
  const user = await requireUser("/account/support");
  const p = parseForm(z.object({ subject: z.string().trim().min(3, "Add a subject."), body: z.string().trim().min(10, "Describe the problem (a sentence or two)."), order: z.string().optional() }), fd);
  if (!p.ok) go("/account/support", { err: p.error });
  const po = p.data.order ? await q<{ id: string }>("select id from parent_orders where order_number = $1 and buyer_id = $2", [p.data.order, user.id]) : [];
  await q("insert into support_tickets (user_id, parent_order_id, subject, body) values ($1,$2,$3,$4)", [user.id, po[0]?.id ?? null, p.data.subject, p.data.body]);
  await notifyAdmins("customer_complaint", { subject: p.data.subject });
  go("/account/support", { msg: "We've received your message and will reply by email." });
}
