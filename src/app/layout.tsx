import type { Metadata, Viewport } from "next";
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
  title: "GRAVITYSCAN — AI-Powered Stock Analysis",
  description:
    "Real-time Nifty 50 stock scanning with RSI-based momentum detection, AI-powered technical analysis, fundamental insights, and news sentiment analysis.",
  keywords: [
    "stock analysis",
    "Nifty 50",
    "RSI scanner",
    "AI trading",
    "Indian stock market",
    "technical analysis",
    "fundamental analysis",
  ],
  openGraph: {
    title: "GRAVITYSCAN — AI-Powered Stock Analysis",
    description:
      "Real-time Nifty 50 stock scanning with RSI-based momentum detection and AI analysis.",
    type: "website",
    siteName: "GRAVITYSCAN",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#05070a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
