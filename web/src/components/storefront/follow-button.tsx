"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleFollowJson } from "@/app/actions/social";

export function FollowButton({ sellerId, initial, size = "md" }: { sellerId: string; initial: boolean; size?: "sm" | "md" }) {
  const [on, setOn] = useState(initial);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" aria-pressed={on}
      onClick={() => {
        const next = !on; setOn(next);
        start(async () => {
          const r = await toggleFollowJson(sellerId);
          if (r.status === "login") { setOn(!next); router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`); }
          else if (r.status === "error") setOn(!next);
        });
      }}
      className={`border transition ${size === "sm" ? "px-3 py-1 text-xs" : "px-5 py-2 text-sm"} font-medium ${on ? "border-forest bg-forest text-white" : "border-forest bg-transparent text-forest hover:bg-forest/5"}`}>
      {on ? "Following" : "Follow"}
    </button>
  );
}
