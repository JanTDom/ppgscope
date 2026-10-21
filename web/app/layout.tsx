import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "PPGscope — Bieżąca analityka mediów Polska Press Grupa",
  description: "Bieżące śledzenie obecności i oddziaływania mediów Polska Press Grupa w sieci oraz struktury tematycznej publikacji z dowodem danych.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0c0d0e] text-[#f4f4f5] selection:bg-[#2563eb] selection:text-white">
        {children}
      </body>
    </html>
  );
}
