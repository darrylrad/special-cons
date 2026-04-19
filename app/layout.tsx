import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GapMap — pre-investment market risk screener",
  description:
    "Screen the market risk of any U.S. small business before you buy. Saturation, churn, stability, diversity, red flags — in one verdict.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen bg-ink-950 text-slate-100 antialiased selection:bg-accent-500/30 selection:text-accent-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
