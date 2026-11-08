import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FOCUS MARAJA - Fotokopi, ATK & Studio (POS)",
  description: "Sistem Kasir Penjualan & Inventaris Toko FOCUS MARAJA - Fotokopi, ATK & Studio Terpadu",
  icons: {
    icon: "/brand/logo-white-bg.png",
    shortcut: "/brand/logo-white-bg.png",
    apple: "/brand/logo-white-bg.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="icon" href="/brand/logo-white-bg.png" type="image/png" />
        <link rel="apple-touch-icon" href="/brand/logo-white-bg.png" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
