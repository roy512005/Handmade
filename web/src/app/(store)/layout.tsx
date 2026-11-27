import { Header } from "@/components/storefront/header";
import { Footer } from "@/components/storefront/footer";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <Header />
      <main className="page-in flex-1">{children}</main>
      <Footer />
    </div>
  );
}
