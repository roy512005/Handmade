import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl text-forest">Lost in the workshop</h1>
      <p className="mt-3 text-muted">We couldn&apos;t find that page.</p>
      <Link href="/" className="mt-6 rounded-control bg-forest px-5 py-2.5 text-sm font-medium text-white">Back to the shop</Link>
    </div>
  );
}
