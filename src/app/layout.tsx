import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "Stake Fish 1.0 — Chess Analyzer & Live Coach",
  description:
    "Stake Fish 1.0: analyze your games by pasting a Lichess or Chess.com link, get live best-move coaching on the board, and grab the browser extension for Chrome, Edge and Opera GX. Powered by the Stake Fish UCI engine (Stockfish NNUE core).",
  keywords: ["chess", "analysis", "Stake Fish", "Stockfish", "UCI", "chess extension", "lichess", "chess.com"],
  authors: [{ name: "Stake Fish" }],
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Stake Fish 1.0 — Chess Analyzer & Live Coach",
    description: "Paste a game link, get engine-grade review. Live best moves while you play. Chrome/Edge extension included.",
    siteName: "Stake Fish",
    type: "website",
    images: ["/icon.png"],
  },
  twitter: {
    card: "summary",
    title: "Stake Fish 1.0 — Chess Analyzer",
    description: "Live chess analysis + game review by link. UCI engine in your browser.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
