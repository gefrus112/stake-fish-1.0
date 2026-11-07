"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Chrome, Download, Eye, Fish, Github, ShieldCheck, Zap } from "lucide-react";

export function ExtensionSection() {
  return (
    <section id="extension" className="rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="ext-title">
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <Fish className="h-5 w-5 text-emerald-600" />
            </span>
            <h2 id="ext-title" className="text-xl font-extrabold tracking-tight">
              Stake Fish Browser Extension
            </h2>
            <Badge className="bg-emerald-600 text-white">v1.0</Badge>
          </div>
          <p className="text-sm leading-relaxed text-neutral-600">
            Analyze <b>live games while you play</b> — no screenshots, no copying FENs. The extension
            reads the board straight from the page DOM on <b>Chess.com</b>, <b>Lichess</b> and more, runs the
            Stake Fish engine locally, and draws the <b>best move arrow + eval pill</b> right on the board.
            The popup detects which chess website you&apos;re on and shows the position verdict instantly.
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2 rounded-lg border bg-neutral-50 px-3 py-2">
              <Eye className="h-4 w-4 flex-none text-emerald-600" /> Reads the live board — zero screenshots
            </li>
            <li className="flex items-center gap-2 rounded-lg border bg-neutral-50 px-3 py-2">
              <Zap className="h-4 w-4 flex-none text-amber-500" /> Best move + eval on every position
            </li>
            <li className="flex items-center gap-2 rounded-lg border bg-neutral-50 px-3 py-2">
              <Chrome className="h-4 w-4 flex-none text-emerald-600" /> Chrome · Edge · Opera GX (Manifest V3)
            </li>
            <li className="flex items-center gap-2 rounded-lg border bg-neutral-50 px-3 py-2">
              <ShieldCheck className="h-4 w-4 flex-none text-emerald-600" /> 100% local — no data leaves your browser
            </li>
          </ul>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <span className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
              <span>
                Reminder: using move assistance in rated/live games violates the fair-play rules of
                Chess.com and Lichess. Use Stake Fish on analysis boards, puzzles review, or your own
                post-game study.
              </span>
            </span>
          </div>
        </div>

        <div className="w-full md:w-80">
          <div className="rounded-2xl border bg-[#1c1c1a] p-5 text-[#fafaf5] shadow-md">
            <h3 className="text-sm font-bold">Install in 4 steps</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed text-neutral-300">
              <li>
                <a href="/stake-fish-extension.zip" download className="font-bold text-emerald-400 underline">
                  Download stake-fish-extension.zip
                </a>{" "}
                and unzip it.
              </li>
              <li>
                Open <code className="rounded bg-white/10 px-1">chrome://extensions</code> (or{" "}
                <code className="rounded bg-white/10 px-1">edge://extensions</code>,{" "}
                <code className="rounded bg-white/10 px-1">opera://extensions</code>).
              </li>
              <li>
                Turn on <b className="text-white">Developer mode</b> → click{" "}
                <b className="text-white">Load unpacked</b>.
              </li>
              <li>
                Select the unzipped <b className="text-white">stake-fish</b> folder — then open any live game on
                Chess.com or Lichess. 🐟
              </li>
            </ol>
            <Button asChild className="mt-4 w-full bg-emerald-600 text-white hover:bg-emerald-700">
              <a href="/stake-fish-extension.zip" download>
                <Download className="h-4 w-4" /> Download for Chrome &amp; Edge
              </a>
            </Button>
            <p className="mt-2 text-center text-[10px] text-neutral-500">
              Also works in Opera GX and any Chromium browser.
            </p>
          </div>

          <div className="mt-3 rounded-xl border p-3 text-xs text-neutral-600">
            <div className="flex items-center gap-1.5 font-bold">
              <Github className="h-3.5 w-3.5" /> Engine source
            </div>
            <a
              href="https://github.com/gefrus112/stake-fish-1.0"
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate font-medium text-emerald-700 underline"
            >
              github.com/gefrus112/stake-fish-1.0
            </a>
            <a
              href="https://github.com/official-stockfish/Stockfish"
              target="_blank"
              rel="noreferrer"
              className="block truncate text-neutral-500 underline"
            >
              upstream: official-stockfish/Stockfish
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
