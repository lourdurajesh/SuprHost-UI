import type { Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

// Downloaded at build time and served from this origin (no third-party font requests).
const body = Instrument_Sans({ variable: "--font-body", subsets: ["latin"], display: "swap" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} antialiased`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
