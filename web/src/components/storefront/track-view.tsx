"use client";
import { useEffect } from "react";

/** Remembers the last products viewed in a cookie so the home page can show "Recently viewed". */
export function TrackView({ productId }: { productId: string }) {
  useEffect(() => {
    try {
      const cur = document.cookie.split("; ").find((c) => c.startsWith("rv="))?.slice(3) ?? "";
      const ids = [productId, ...decodeURIComponent(cur).split(",").filter((i) => i && i !== productId)].slice(0, 12);
      document.cookie = `rv=${encodeURIComponent(ids.join(","))}; path=/; max-age=${30 * 86400}; samesite=lax`;
    } catch { /* cookies blocked — nothing to remember */ }
  }, [productId]);
  return null;
}
