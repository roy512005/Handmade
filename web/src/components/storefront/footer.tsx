import Link from "next/link";

const cols: [string, [string, string][]][] = [
  ["Explore", [["Discover", "/discover"], ["Categories", "/categories"], ["Artisan Stories", "/stories"], ["Collections", "/collections"]]],
  ["Handmade", [["About", "/about"], ["Contact", "/contact"], ["Sell with us", "/sell"], ["FAQs", "/faq"]]],
  ["Help", [["Shipping & returns", "/shipping-policy"], ["Returns & refunds", "/returns"], ["Privacy policy", "/privacy"], ["Terms", "/terms"]]],
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-forest text-ivory">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-16 md:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="font-serif text-4xl">Handmade</p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/70">A small marketplace for things made by hand across India, and the people who make them.</p>
          <p className="mt-6 text-xs uppercase tracking-[0.14em] text-ivory/60">Follow along</p>
          <div className="mt-2 flex gap-5 text-sm"><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-gold">Instagram</a>
            <a href="https://www.pinterest.com/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-gold">Pinterest</a></div>
        </div>
        {cols.map(([h, items]) => (
          <div key={h}><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{h}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ivory/80">{items.map(([l, href]) => <li key={l}><Link href={href} className="hover:text-white">{l}</Link></li>)}</ul></div>))}
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-ivory/50">© Handmade · Demo artwork is illustrative; makers upload their own photographs.</div>
    </footer>
  );
}
