import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tunnel Manager",
  description: "Manage Cloudflare Tunnel domains, DNS, and cloudflared processes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SpeedInsights />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
