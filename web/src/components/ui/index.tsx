import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/dashboard/icons";

export const btn =
  "btn-primary inline-flex items-center justify-center rounded-[var(--btn-radius)] bg-[var(--btn-bg)] px-5 py-2.5 text-sm font-medium text-[color:var(--btn-fg)] transition hover:opacity-90 disabled:opacity-50";
export const btn2 =
  "inline-flex items-center justify-center rounded-[var(--btn-radius)] border border-forest bg-surface px-5 py-2.5 text-sm font-medium text-forest transition hover:bg-sand/60";
export const btnDanger =
  "inline-flex items-center justify-center rounded-[var(--btn-radius)] border border-error bg-surface px-4 py-2 text-sm font-medium text-error transition hover:bg-error/5";
export const btnSm = "!px-3 !py-1.5 !text-xs";
export const input =
  "w-full rounded-control border border-line bg-surface px-3 py-2 text-sm placeholder:text-muted focus:border-forest";
export const card = "rounded-card border border-line bg-surface p-5 shadow-sm";

export function Field({
  label, name, type = "text", defaultValue, required, hint, placeholder, children, rows,
}: {
  label: string; name: string; type?: string; defaultValue?: string | number | null; required?: boolean;
  hint?: string; placeholder?: string; children?: ReactNode; rows?: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium">{label}{required && <span className="text-error"> *</span>}</label>
      {children ?? (rows ? (
        <textarea id={name} name={name} rows={rows} required={required} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={input} />
      ) : (
        <input id={name} name={name} type={type} required={required} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={input} />
      ))}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const tone: Record<string, string> = {
  green: "bg-[#DFF3E6] text-[#1B7A47]", amber: "bg-[#FDF0C8] text-[#8A6100]",
  red: "bg-[#FBE0DE] text-error", grey: "bg-sand/60 text-muted", terracotta: "bg-terracotta/15 text-terracotta",
};
export function Badge({ children, color = "grey" }: { children: ReactNode; color?: keyof typeof tone }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tone[color]}`}>{children}</span>;
}

export function statusColor(s: string): keyof typeof tone {
  if (["approved", "delivered", "active", "paid", "captured", "published", "processed", "completed", "payment_confirmed", "available", "settled"].includes(s)) return "green";
  if (["rejected", "suspended", "cancelled", "failed", "delivery_failed", "refunded", "hidden"].includes(s)) return "red";
  if (["pending", "pending_approval", "under_review", "placed", "draft", "return_requested", "return_in_progress", "created"].includes(s)) return "amber";
  return "grey";
}
export const label = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export function Flash({ err, msg }: { err?: string; msg?: string }) {
  if (!err && !msg) return null;
  return (
    <div role={err ? "alert" : "status"} className={`mb-4 rounded-control px-4 py-3 text-sm ${err ? "bg-error/10 text-error" : "bg-sage text-forest"}`}>
      {err ?? msg}
    </div>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl text-charcoal md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-ivory text-[13px] font-semibold text-charcoal">
          <tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-4 py-3.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line [&>tr:hover]:bg-ivory/70">{children}</tbody>
      </table>
      {empty && <p className="p-6 text-center text-sm text-muted">{empty}</p>}
    </div>
  );
}
export const Td = ({ children, className = "" }: { children?: ReactNode; className?: string }) => <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>;

const STAT = [
  { bg: "bg-[#E4EEFF]", fg: "text-[#3B82F6]" },
  { bg: "bg-[#EFE7FF]", fg: "text-[#8B5CF6]" },
  { bg: "bg-[#FFEBD6]", fg: "text-[#F28C28]" },
  { bg: "bg-[#FFE1E1]", fg: "text-[#E5484D]" },
];
const STAT_ICONS = ["wallet", "layers", "rupee", "alert"];
export function Stat({ label: l, value, sub, tone, icon }: { label: string; value: ReactNode; sub?: string; tone?: number; icon?: string }) {
  const i = tone ?? [...l].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
  const t = STAT[i];
  const up = sub?.trim().startsWith("+"), down = sub?.trim().startsWith("-") || sub?.trim().startsWith("−");
  return (
    <div className="rounded-card border border-line/70 bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${t.bg}`}><Icon name={icon ?? STAT_ICONS[i]} className={`h-5 w-5 ${t.fg}`} /></span>
        <p className="min-w-0 truncate text-[15px]">{l}</p>
      </div>
      <p className="mt-5 text-[28px] font-semibold leading-none tracking-tight">{value}</p>
      <p className={`mt-2 text-xs ${up ? "text-[#1B8A3A]" : down ? "text-error" : "text-muted"}`}>{sub ?? "\u00a0"}</p>
    </div>
  );
}

/** Dark call-to-action card with a lime button. */
export function PromoCard({ title, text, href, cta }: { title: string; text?: string; href: string; cta: string }) {
  return (
    <div className="flex flex-col rounded-card p-6 text-white shadow-sm" style={{ background: "radial-gradient(120% 90% at 0% 0%, #4F7D14 0%, rgba(79,125,20,0) 55%), #0B0D0B" }}>
      <h2 className="text-2xl leading-snug">{title}</h2>{text && <p className="mt-2 text-sm text-white/70">{text}</p>}
      <Link href={href} className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-lime px-5 py-3 text-sm font-semibold text-[#111411]">{cta}</Link>
    </div>
  );
}

/** Segmented progress bar with legend, e.g. order progress. */
export function ProgressSplit({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = Math.max(1, parts.reduce((a, p) => a + p.value, 0));
  return (
    <div>
      <div className="flex h-2 gap-1 overflow-hidden rounded-full bg-sand" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}>
        {parts.map((p) => <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} className="rounded-full" />)}</div>
      <div className="mt-2 flex flex-wrap gap-x-4 text-xs text-muted">{parts.map((p) => <span key={p.label} className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />{Math.round((p.value / total) * 100)}% {p.label}</span>)}</div>
    </div>
  );
}

/** Bar chart: grey bars, the peak highlighted in lime with a dark value tooltip. */
export function BarChart({ data, height = 190, labelEvery = 1 }: { data: { label: string; value: number; display: string }[]; height?: number; labelEvery?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((bi, d, i, a) => (d.value > a[bi].value ? i : bi), 0);
  const hasData = data.some((d) => d.value > 0);
  return (
    <div role="img" aria-label={`Bar chart. ${data.map((d) => `${d.label}: ${d.display}`).join(", ")}`}>
      <div className="relative" style={{ height }}>
        {[0, 1, 2, 3].map((g) => <div key={g} className="absolute inset-x-0 border-t border-dashed border-line" style={{ top: `${(g / 3) * 100}%` }} />)}
        <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2.5">
          {data.map((d, i) => (
            <div key={d.label} className="group relative flex h-full flex-1 items-end" title={`${d.label}: ${d.display}`}>
              <div className={`w-full rounded-xl transition ${hasData && i === peak && d.value > 0 ? "bg-gradient-to-b from-[#8FEA12] to-[#C9FA7C]" : "bg-[#F1F2EF] group-hover:bg-[#DDF6A6]"}`} style={{ height: `${Math.max(6, (d.value / max) * 100)}%` }} />
              {hasData && i === peak && d.value > 0 && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0B0D0B] px-2.5 py-1 text-xs font-medium text-white" style={{ bottom: `calc(${Math.max(6, (d.value / max) * 100)}% + 8px)` }}>{d.display}</span>}
            </div>))}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2.5 text-[11px] text-muted">{data.map((d, i) => <span key={d.label} className={`flex-1 text-center ${i === peak && hasData ? "font-medium text-charcoal" : ""}`}>{i % labelEvery === 0 ? d.label : ""}</span>)}</div>
    </div>
  );
}

/** Numbered pagination: 1 2 3 … N */
export function NumberPager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  const set = new Set([1, 2, 3, pages, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) items.push("gap"); items.push(n); });
  const cell = "flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm";
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-end gap-1">
      {page > 1 ? <Link href={href(page - 1)} className={`${cell} hover:bg-sand/60`} aria-label="Previous page">‹</Link> : <span className={`${cell} text-muted/40`}>‹</span>}
      {items.map((n, i) => n === "gap" ? <span key={`g${i}`} className={`${cell} text-muted`}>…</span> :
        <Link key={n} href={href(n)} aria-current={n === page ? "page" : undefined} className={`${cell} ${n === page ? "bg-[#111411] font-medium text-white" : "hover:bg-sand/60"}`}>{n}</Link>)}
      {page < pages ? <Link href={href(page + 1)} className={`${cell} hover:bg-sand/60`} aria-label="Next page">›</Link> : <span className={`${cell} text-muted/40`}>›</span>}
    </nav>
  );
}

export function stockInfo(n: number): { text: string; color: "green" | "amber" | "red" } {
  return n <= 0 ? { text: "Out of stock", color: "red" } : n <= 5 ? { text: "Low stock", color: "amber" } : { text: "Available stock", color: "green" };
}

/** Filter bar: a search box plus dropdown filters, submitted as a GET form. */
export function FilterBar({ action, q, selects, children }: { action: string; q?: string; selects: { name: string; label: string; value?: string; options: [string, string][] }[]; children?: ReactNode }) {
  return (
    <form action={action} className="mb-4 flex flex-wrap items-center gap-2 text-sm">
      <div className="relative min-w-52 flex-1 sm:max-w-xs">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"><Icon name="search" className="h-4 w-4" /></span>
        <label htmlFor="fq" className="sr-only">Search</label>
        <input id="fq" name="q" defaultValue={q} placeholder="Search…" className="w-full rounded-full border border-line bg-surface py-2 pl-9 pr-3 placeholder:text-muted" />
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {selects.map((f) => (
          <span key={f.name}><label htmlFor={`f-${f.name}`} className="sr-only">{f.label}</label>
            <select id={`f-${f.name}`} name={f.name} defaultValue={f.value ?? ""} className="rounded-full border border-line bg-surface px-3 py-2 text-sm">
              <option value="">{f.label}</option>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></span>))}
        {children}
        <button className={`${btn} !py-2`}>Apply</button>
      </div>
    </form>
  );
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (p: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3 text-sm">
      {page > 1 && <Link className={btn2} href={href(page - 1)}>Previous</Link>}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages && <Link className={btn2} href={href(page + 1)}>Next</Link>}
    </nav>
  );
}

export function ProductImage({ url, title, className = "" }: { url?: string | null; title: string; className?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={title} className={`h-full w-full object-cover ${className}`} loading="lazy" />
  ) : (
    <div className={`flex h-full w-full items-center justify-center bg-sand font-serif text-4xl text-forest/40 ${className}`} aria-label={title} role="img">
      {title.slice(0, 1)}
    </div>
  );
}

/** Build a URL with only the non-empty query params. */
export function qs(base: string, params: Record<string, string | undefined>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) u.set(k, v);
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}
