import type { Metadata } from "next";
import { DM_Sans, Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Handmade — Pieces With Stories", template: "%s — Handmade" },
  description: "Discover thoughtfully made creations from independent makers across India.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable} ${dmSans.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
