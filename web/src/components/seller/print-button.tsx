"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="rounded-control bg-forest px-4 py-2 text-sm text-white print:hidden">Print label</button>;
}
