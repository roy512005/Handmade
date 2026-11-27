export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 md:px-8" aria-busy="true" aria-label="Loading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="skeleton aspect-[4/5] w-full lg:col-span-7" />
        <div className="space-y-4 lg:col-span-5"><div className="skeleton h-4 w-32" /><div className="skeleton h-12 w-3/4" /><div className="skeleton h-6 w-28" /><div className="skeleton h-14 w-full" /><div className="skeleton h-28 w-full" /></div>
      </div>
    </div>
  );
}
