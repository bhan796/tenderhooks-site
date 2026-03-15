import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Header } from "@/components/header";

export const metadata: Metadata = {
  title: "Your Company Name",
  description: "Your company description",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${GeistMono.variable} antialiased`} suppressHydrationWarning>
        <Header />
        {children}
      </body>
    </html>
  );
}
