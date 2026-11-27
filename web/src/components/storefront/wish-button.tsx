"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlistJson } from "@/app/actions/shop";
import { Icon } from "@/components/dashboard/icons";

/** Heart toggle: optimistic, no page reload, sends signed-out visitors to sign in. */
export function WishButton({ productId, initial, className = "" }: { productId: string; initial: boolean; className?: string }) {
  const [on, setOn] = useState(initial);
  const [pop, setPop] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" aria-pressed={on} aria-label={on ? "Remove from wishlist" : "Save to wishlist"} onAnimationEnd={() => setPop(false)}
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        const next = !on; setOn(next); setPop(true);
        start(async () => {
          const r = await toggleWishlistJson(productId);
          if (r.status === "login") { setOn(!next); router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`); }
          else if (r.status === "error") setOn(!next);
        });
      }}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-ivory/90 backdrop-blur transition hover:bg-white ${on ? "text-terracotta" : "text-charcoal"} ${pop ? "animate-pop" : ""} ${className}`}>
      <Icon name="heart" filled={on} className="h-[18px] w-[18px]" />
    </button>
  );
}
