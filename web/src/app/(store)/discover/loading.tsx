export default function Loading() {
  const h = ["h-72", "h-96", "h-80", "h-64", "h-96", "h-72", "h-80", "h-64"];
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8 md:py-14" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-5 w-40" /><div className="skeleton mt-4 h-14 w-2/3 max-w-xl" />
      <div className="mt-10 columns-2 gap-4 md:columns-3 md:gap-6 xl:columns-4">{h.map((x, i) => <div key={i} className="mb-8 break-inside-avoid"><div className={`skeleton ${x} w-full`} /><div className="skeleton mt-3 h-3 w-24" /><div className="skeleton mt-2 h-4 w-40" /></div>)}</div>
    </div>
  );
}
