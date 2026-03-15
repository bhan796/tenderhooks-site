import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Tender Hooks — High-Fit Tender Intelligence",
  description: "Tender Hooks scans public tenders and delivers ranked, actionable opportunities daily.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={GeistMono.variable} suppressHydrationWarning>
        <Header />
        {children}
      </body>
    </html>
  );
}
