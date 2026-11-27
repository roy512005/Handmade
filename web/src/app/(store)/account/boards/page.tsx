/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getUser } from "@/lib/server/auth";
import { myBoards } from "@/lib/server/social";
import { createBoardAction } from "@/app/actions/social";
import { btn, card, Flash, input, PageTitle } from "@/components/ui";

export const metadata = { title: "Moodboards" };

export default async function Boards({ searchParams }: { searchParams: Promise<{ err?: string; msg?: string }> }) {
  const sp = await searchParams;
  const user = (await getUser())!;
  const boards = await myBoards(user.id);
  return (
    <>
      <PageTitle title="Moodboards" sub="Collect pieces you love into boards — a kitchen refresh, a gift list, a colour story." /><Flash {...sp} />
      <form action={createBoardAction} className="mb-8 flex max-w-md gap-2"><label htmlFor="bn" className="sr-only">Board name</label><input id="bn" name="name" placeholder="New board, e.g. “Terracotta corner”" className={input} /><button className={btn}>Create</button></form>
      {boards.length === 0 ? <div className={`${card} text-center`}><p className="font-serif text-2xl">No boards yet</p><p className="mt-1 text-sm text-muted">Open any piece and use “Save to a moodboard”.</p><Link href="/discover" className="mt-3 inline-block text-sm underline underline-offset-4">Go discover</Link></div> : (
        <ul className="grid gap-6 sm:grid-cols-2">{boards.map((b) => (
          <li key={b.id}><Link href={`/account/boards/${b.id}`} className="group block">
            <div className="grid aspect-[16/10] grid-cols-4 gap-px overflow-hidden bg-line">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-sand">{b.covers[i] && <img src={b.covers[i]} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>)}</div>
            <p className="mt-2 font-serif text-xl">{b.name}</p><p className="text-xs text-muted">{b.n} {b.n === 1 ? "piece" : "pieces"} · {b.is_public ? "Shared" : "Private"}</p></Link></li>))}</ul>)}
    </>
  );
}
