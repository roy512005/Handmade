"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getUser, requireUser } from "@/lib/server/auth";
import { q, q1 } from "@/lib/server/db";
import { go, parseForm, safeNext } from "@/lib/server/form";
import { toggleFollow } from "@/lib/server/social";

export async function toggleFollowJson(sellerId: string): Promise<{ status: "followed" | "unfollowed" | "login" | "error" }> {
  if (!z.string().uuid().safeParse(sellerId).success) return { status: "error" };
  const user = await getUser();
  if (!user) return { status: "login" };
  const on = await toggleFollow(user.id, sellerId);
  revalidatePath("/account/following");
  return { status: on ? "followed" : "unfollowed" };
}

export async function createBoardAction(fd: FormData) {
  const user = await requireUser("/account/boards");
  const back = safeNext(fd.get("back"), "/account/boards");
  const p = parseForm(z.object({ name: z.string().trim().min(2, "Give your board a name.").max(60) }), fd);
  if (!p.ok) go(back, { err: p.error });
  const n = (await q1<{ n: number }>("select count(*)::int n from moodboards where user_id = $1", [user.id]))!.n;
  if (n >= 30) go(back, { err: "You've reached the limit of 30 boards." });
  await q("insert into moodboards (user_id, name) values ($1,$2)", [user.id, p.data.name]);
  go(back, { msg: "Board created." });
}

export async function saveToBoardAction(fd: FormData) {
  const user = await requireUser();
  const back = safeNext(fd.get("back"), "/account/boards");
  const productId = z.string().uuid().safeParse(fd.get("productId"));
  if (!productId.success) go(back);
  let boardId = String(fd.get("boardId") ?? "");
  const newName = String(fd.get("newName") ?? "").trim();
  if (boardId === "new" || (!boardId && newName)) {
    if (newName.length < 2) go(back, { err: "Name your new board first." });
    const b = await q1<{ id: string }>("insert into moodboards (user_id, name) values ($1,$2) returning id", [user.id, newName.slice(0, 60)]);
    boardId = b!.id;
  }
  const own = await q1("select 1 from moodboards where id = $1 and user_id = $2", [boardId, user.id]);
  if (!own) go(back, { err: "Choose a board." });
  await q("insert into moodboard_items (board_id, product_id) values ($1,$2) on conflict do nothing", [boardId, productId.data]);
  go(back, { msg: "Saved to your board." });
}

export async function boardItemAction(fd: FormData) {
  const user = await requireUser();
  const boardId = z.string().uuid().parse(fd.get("boardId"));
  const op = String(fd.get("op"));
  const own = await q1("select 1 from moodboards where id = $1 and user_id = $2", [boardId, user.id]);
  if (!own) go("/account/boards");
  if (op === "remove") await q("delete from moodboard_items where board_id = $1 and product_id = $2", [boardId, z.string().uuid().parse(fd.get("productId"))]);
  else if (op === "toggle_public") await q("update moodboards set is_public = not is_public where id = $1", [boardId]);
  else if (op === "delete") { await q("delete from moodboards where id = $1", [boardId]); go("/account/boards", { msg: "Board deleted." }); }
  go(`/account/boards/${boardId}`);
}

export async function savePreferencesAction(fd: FormData) {
  const user = await requireUser("/account/preferences");
  const on = (k: string) => fd.get(k) === "on";
  await q(
    `insert into notification_preferences (user_id, wishlist_alerts, followed_artisans, weekly_drops, order_updates) values ($1,$2,$3,$4,$5)
     on conflict (user_id) do update set wishlist_alerts = $2, followed_artisans = $3, weekly_drops = $4, order_updates = $5`,
    [user.id, on("wishlist_alerts"), on("followed_artisans"), on("weekly_drops"), on("order_updates")]);
  go("/account/preferences", { msg: "Preferences saved." });
}
