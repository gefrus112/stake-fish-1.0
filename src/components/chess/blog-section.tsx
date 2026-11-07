"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronDown, Fish } from "lucide-react";

interface Post {
  slug: string;
  title: string;
  date: string;
  tag: string;
  excerpt: string;
  body: string[];
}

const POSTS: Post[] = [
  {
    slug: "stake-fish-1-2",
    title: "Stake Fish 1.2 — live link watching, Jessie bot, ChessKid support",
    date: "2026-11-07",
    tag: "Release",
    excerpt:
      "Paste a live Chess.com or Lichess link and the site mirrors the game move by move while coaching your next move. Plus: play against Jessie, and the extension now supports 3 sites.",
    body: [
      "The headline feature of 1.2 is live link watching. Paste a link like chess.com/game/186718258398 or any lichess.org game URL into the Watch Link tab and the analyzer polls the game, pulls every move both players make onto the on-site board, and continuously shows the best move for the side to move — a real-time second screen for your own games.",
      "Jessie joins the team as the built-in bot coach. She runs on the same Stake Fish engine as everything else, with six levels from Beginner (UCI Skill 1) to Maximum (Skill 20, depth 16). She talks back — encouragingly — while you play.",
      "The extension hits v1.2 with exactly three deeply supported sites: Chess.com, Lichess and ChessKid. It reads the live board from the page DOM (never screenshots), runs the engine locally in your browser, and draws best-move arrows right on the board.",
      "Finally, the whole site got a liquid-blue redesign with a canvas code-rain background — because a chess engine site should look like the machine it is.",
    ],
  },
  {
    slug: "how-live-watching-works",
    title: "How live link watching actually works",
    date: "2026-11-06",
    tag: "Engineering",
    excerpt:
      "No magic: public game APIs, a polling loop, position diffing and the UCI engine combine to mirror a live game on your board within seconds.",
    body: [
      "When you paste a game link, the site asks our server to fetch the current PGN of that game from the public Lichess export API or Chess.com's game endpoint. The PGN is parsed into a move list with a FEN after every move.",
      "While Watch mode is on, the site re-fetches the game every ~6 seconds and diffs the move list. New moves are appended to the board, the view follows the latest position, and the engine immediately starts searching that position — so the green arrow you see is the best continuation for whichever player is on the move.",
      "Everything runs client-side after the fetch: the engine is a Web Worker in your browser, the eval bar and arrows are pure rendering. The only network traffic is the periodic PGN poll — no account, no tokens, no game data stored.",
    ],
  },
  {
    slug: "reading-the-eval-bar",
    title: "Reading the eval bar like a pro",
    date: "2026-11-05",
    tag: "Guides",
    excerpt:
      "+0.3 means nothing and everything. Here's how to convert engine numbers into actual chess decisions.",
    body: [
      "The eval bar shows winning chances, not the eval number itself. Stake Fish converts centipawns into a win probability using a sigmoid curve: +1.0 is roughly a 64% chance for White, +2.0 about 83%, and +5 or more is effectively winning.",
      "That matters because engines think in centipawns while humans should think in chances. A +0.8 structurally pleasant position is far less dangerous than a -0.2 position where your king is stuck in the middle.",
      "Watch the bar's swings after every move in a review. The moves that swing it the most are your real levers — that's exactly what the game report counts as mistakes and blunders.",
    ],
  },
  {
    slug: "jessie-levels-explained",
    title: "Jessie's levels, explained (and how to beat Club Jessie)",
    date: "2026-11-04",
    tag: "Guides",
    excerpt:
      "Jessie maps each level to a UCI Skill Level and a search depth. Here's what that means practically — and where she's weak.",
    body: [
      "Beginner and Casual Jessie deliberately play below her strength: the engine picks from weaker moves at low Skill Levels, so she hangs pieces and misses tactics sometimes — perfect for practice.",
      "From Club upward she stops giving gifts. The best anti-Jessie plan is the anti-engine plan: close the position, avoid loopy tactics, and grind a slow edge. She doesn't get bored or tilted.",
      "Maximum Jessie (Skill 20, depth 16) is genuinely strong — roughly strong club / candidate-master level in this WASM build. Beat her once and you've earned the splash emoji.",
    ],
  },
];

export function BlogSection() {
  const [open, setOpen] = useState<string | null>(POSTS[0]?.slug ?? null);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
          <Fish className="h-5 w-5 text-blue-400" />
        </span>
        <h2 className="text-xl font-extrabold tracking-tight text-white">Stake Fish Blog</h2>
        <Badge variant="outline" className="border-white/15 text-blue-200/70">
          {POSTS.length} posts
        </Badge>
      </div>

      {POSTS.map((post) => {
        const isOpen = open === post.slug;
        return (
          <article
            key={post.slug}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur transition-colors hover:border-blue-400/30"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : post.slug)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-0 bg-blue-500/15 text-blue-300">{post.tag}</Badge>
                  <span className="flex items-center gap-1 text-[11px] text-blue-200/40">
                    <CalendarDays className="h-3 w-3" /> {post.date}
                  </span>
                </div>
                <h3 className="mt-1.5 text-sm font-bold text-white sm:text-base">{post.title}</h3>
                {!isOpen && <p className="mt-1 line-clamp-1 text-xs text-blue-100/50">{post.excerpt}</p>}
              </div>
              <ChevronDown
                className={`h-4 w-4 flex-none text-blue-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="border-t border-white/5 px-5 py-4">
                <p className="mb-3 text-sm font-medium text-blue-100/80">{post.excerpt}</p>
                <div className="flex flex-col gap-3 text-sm leading-relaxed text-blue-100/60">
                  {post.body.map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            )}
          </article>
        );
      })}

      <Button
        variant="outline"
        className="self-start border-white/15 text-slate-200 hover:bg-white/10"
        onClick={() => setOpen(null)}
      >
        Collapse all
      </Button>
    </section>
  );
}
