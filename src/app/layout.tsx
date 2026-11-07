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
  title: "Stake Fish 1.2 — Live Chess Analyzer, Link Watcher & Jessie Bot",
  description:
    "Stake Fish 1.2: paste a live Chess.com / Lichess game link and watch it on our board with best-move arrows, play against Jessie the chess bot coach, review any game, and grab the v1.2 extension for Chrome, Edge and Opera GX (Chess.com + Lichess + ChessKid). Powered by the Stake Fish UCI engine.",
  keywords: ["chess", "analysis", "Stake Fish", "Stockfish", "UCI", "chess extension", "lichess", "chess.com", "chesskid", "jessie bot"],
  authors: [{ name: "Stake Fish" }],
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Stake Fish 1.2 — Live Chess Analyzer & Jessie Bot",
    description: "Watch live game links on our board with best-move arrows. Play Jessie. Chrome/Edge/OperaGX extension for Chess.com, Lichess & ChessKid.",
    siteName: "Stake Fish",
    type: "website",
    images: ["/icon.png"],
  },
  twitter: {
    card: "summary",
    title: "Stake Fish 1.2 — Chess Analyzer",
    description: "Live link watching, Jessie bot, game review. UCI engine in your browser.",
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
