import type { ReactNode } from "react";

const P: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  box: <><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>,
  cart: <><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M3 4h2l2.4 11h11l2-8H6" /></>,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2.5" /><path d="M16 13h2M3 10h18M6 6l9-3v3" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.900 1.900 6.500 5.500" /><circle cx="17" cy="9" r="2.5" /><path d="M17.500 14.500c2.300.3 3.800 1.900 4 4.500" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  tag: <><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.500" cy="8.500" r="1.200" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.400-1 .9-1 1.700M12 17h.01" /></>,
  file: <><path d="M6 3h8l4 4v14H6V3Z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></>,
  bell: <><path d="M6 17V11a6 6 0 1 1 12 0v6l2 2H4l2-2Z" /><path d="M10 21h4" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.500-3.500" /></>,
  store: <><path d="M4 9 5.500 4h13L20 9M4 9v11h16V9M4 9c0 1.700 1.300 3 2.700 3S9.300 10.700 9.300 9c0 1.700 1.300 3 2.700 3s2.700-1.300 2.700-3c0 1.700 1.300 3 2.700 3S20 10.700 20 9" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  refund: <><path d="M4 12a8 8 0 1 0 3-6.200M4 4v4h4" /></>,
  truck: <><path d="M2 6h11v10H2zM13 9h5l3 3v4h-8" /><circle cx="7" cy="18" r="1.800" /><circle cx="17" cy="18" r="1.800" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  check: <><path d="m5 12 5 5 9-10" /></>,
  alert: <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17h.01" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  rupee: <><path d="M7 5h10M7 9h10M7 5c5 0 7 1.500 7 4s-2 4-7 4l7 6" /></>,
  heart: <><path d="M12 20s-7.500-4.600-9-9.500C1.800 6.800 4.200 4 7.200 4c1.900 0 3.500 1 4.800 2.800C13.300 5 14.900 4 16.800 4c3 0 5.400 2.800 4.200 6.500-1.500 4.900-9 9.500-9 9.500Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c.8-4.200 4-6 8-6s7.200 1.800 8 6" /></>,
  bag: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>,
  home: <><path d="M4 11 12 4l8 7v9H4z" /><path d="M10 20v-5h4v5" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.500 8.500-2 5-5 2 2-5z" /></>,
  log: <><path d="M5 4h14v16H5zM9 8h6M9 12h6M9 16h4" /></>,
};

export function Icon({ name, className = "h-5 w-5", filled = false }: { name: string; className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {P[name] ?? P.box}
    </svg>
  );
}
