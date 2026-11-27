"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl text-forest">Something went wrong</h1>
      <p className="mt-3 text-muted">Please try again. If it keeps happening, contact support.</p>
      <button onClick={reset} className="mt-6 rounded-control bg-forest px-5 py-2.5 text-sm font-medium text-white">Try again</button>
    </div>
  );
}
