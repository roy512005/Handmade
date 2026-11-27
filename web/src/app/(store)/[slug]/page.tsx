import { notFound } from "next/navigation";

const PAGES: Record<string, { title: string; body: string[] }> = {
  about: { title: "About Handmade", body: ["Handmade is a small marketplace for things made by hand across India. We review every maker before they can sell, and we ask them to tell us how their work is made.", "We don't use fake countdowns, invented scarcity or paid-for reviews. A piece is marked “one of a kind” only when a single one exists.", "This is a demo build: payments, shipping and messaging are simulated until the business is set up."] },
  contact: { title: "Contact", body: ["Have a question about an order? Sign in and use Help & support in your account — it reaches our team directly.", "Makers: use the seller dashboard for order questions, or apply to sell from the “Sell with us” page.", "(Public contact details will be added before launch.)"] },
  "shipping-policy": { title: "Shipping policy", body: ["Each maker ships their own pieces, so an order with items from several makers arrives as separate parcels, each with its own tracking.", "Makers prepare your order within the processing time shown on the product page. Made-to-order pieces take longer.", "Shipping is calculated per maker from parcel weight. We deliver across India to serviceable PIN codes."] },
  returns: { title: "Returns & refunds", body: ["If an item arrives damaged or not as described, request a return within the return window after delivery.", "Made-to-order and personalised items can't be returned unless they arrive damaged — contact support.", "Approved refunds go back to your original payment method."] },
  privacy: { title: "Privacy policy", body: ["We collect only what we need to process orders. Your address is shared only with the maker fulfilling your order and the courier.", "We never sell personal data. You can ask us to delete your account at any time.", "(Placeholder text — have this reviewed by a lawyer before launch.)"] },
  terms: { title: "Terms & conditions", body: ["(Placeholder — have this drafted by a lawyer before launch.)"] },
  faq: { title: "FAQs", body: ["Are products really handmade? Every maker is reviewed before approval and agrees to sell only handmade work.", "Can I cancel? Yes, until the courier has picked the parcel up.", "Can I buy from several makers at once? Yes — one checkout, separate shipments."] },
};
export function generateStaticParams() { return Object.keys(PAGES).map((slug) => ({ slug })); }
export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = PAGES[(await params).slug];
  if (!p) notFound();
  return (<div className="mx-auto max-w-2xl px-4 py-12"><h1 className="text-4xl text-forest">{p.title}</h1><div className="mt-6 space-y-4 text-sm leading-relaxed">{p.body.map((t, i) => <p key={i}>{t}</p>)}</div></div>);
}
