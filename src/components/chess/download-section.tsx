"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check, Chrome, Download, Fish, Globe, ShieldCheck, Sparkles } from "lucide-react";

const V12_FEATURES = [
  "Connects to live boards on Chess.com, Lichess and ChessKid — no screenshots, ever",
  "Detects which chess website you're on automatically from the popup",
  "Draws best-move arrows + eval pill directly on the live board",
  "Advisor styles: GM Coach hype or plain bot moves",
  "Runs the Stake Fish engine (Stockfish 19 NNUE core) 100% locally",
  "Depth slider, arrow toggle, auto-analyze switch in the popup",
];

export function DownloadSection() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15">
              <Fish className="h-5 w-5 text-blue-400" />
            </span>
            <h2 className="text-xl font-extrabold tracking-tight text-white">Download Stake Fish</h2>
            <Badge className="border-0 bg-blue-500 text-white">v1.2</Badge>
          </div>
          <p className="text-sm leading-relaxed text-blue-100/60">
            The Stake Fish extension connects to your live games on{" "}
            <b className="text-blue-200">Chess.com</b>, <b className="text-blue-200">Lichess</b> and{" "}
            <b className="text-blue-200">ChessKid</b> — exactly 3 websites, deeply supported. It reads the
            board straight from the page, analyzes every move with the local engine and shows the best
            move for your position while you play.
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {V12_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-blue-100/80">
                <Check className="mt-0.5 h-4 w-4 flex-none text-blue-400" /> {f}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-blue-200/50">
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
              <Chrome className="h-3.5 w-3.5" /> Chrome
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
              <Globe className="h-3.5 w-3.5" /> Edge
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
              <Sparkles className="h-3.5 w-3.5" /> Opera GX
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5" /> 100% local
            </span>
          </div>

          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200/80">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <span>
                Using move assistance in rated/live games breaks the fair-play rules of Chess.com,
                Lichess and ChessKid. Use Stake Fish on analysis boards, opening study, or reviewing
                your finished games.
              </span>
            </span>
          </div>
        </div>

        <div className="w-full md:w-80">
          <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-950/80 to-[#060b16] p-5 shadow-xl shadow-blue-500/10">
            <div className="text-sm font-bold text-white">Install in 4 steps</div>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-blue-100/60">
              <li>
                <a href="/stake-fish-extension.zip" download className="font-bold text-blue-300 underline">
                  Download stake-fish-extension.zip
                </a>{" "}
                and unzip it.
              </li>
              <li>
                Open <code className="rounded bg-white/10 px-1 text-blue-200">chrome://extensions</code> (or{" "}
                <code className="rounded bg-white/10 px-1 text-blue-200">edge://extensions</code>,{" "}
                <code className="rounded bg-white/10 px-1 text-blue-200">opera://extensions</code>).
              </li>
              <li>
                Enable <b className="text-white">Developer mode</b> → click <b className="text-white">Load unpacked</b>.
              </li>
              <li>
                Pick the unzipped <b className="text-white">stake-fish</b> folder, open any game on Chess.com,
                Lichess or ChessKid — and fish away. 🐟
              </li>
            </ol>
            <Button asChild className="mt-4 w-full bg-blue-500 text-white hover:bg-blue-400">
              <a href="/stake-fish-extension.zip" download>
                <Download className="h-4 w-4" /> Stake Fish v1.2 — free
              </a>
            </Button>
            <p className="mt-2 text-center text-[10px] text-blue-200/40">
              Manifest V3 · ~1.5 MB · works in any Chromium browser
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-blue-100/50">
            <div className="font-semibold text-blue-200/80">Web version — nothing to install</div>
            The Home tab is the full analyzer: play the board, play Jessie, or paste a live game link and
            get best-move arrows right here on the site.
          </div>
        </div>
      </div>
    </section>
  );
}
