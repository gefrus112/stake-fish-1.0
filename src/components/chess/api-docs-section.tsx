"use client";

import { Badge } from "@/components/ui/badge";
import { Fish, Globe, MessageSquareCode, TerminalSquare } from "lucide-react";

const UCI_ROWS = [
  { cmd: "uci", desc: "Handshake — engine replies with its options and uciok." },
  { cmd: "isready", desc: "Sync check — engine answers readyok when NNUE nets are loaded." },
  { cmd: "position fen <FEN>", desc: "Set the position to analyze." },
  { cmd: "go depth <n>", desc: "Start searching to a fixed depth; stream info lines." },
  { cmd: "setoption name MultiPV value <n>", desc: "Number of best lines to return." },
  { cmd: "stop", desc: "Abort the current search, finish with bestmove." },
];

export function ApiDocsSection() {
  return (
    <section id="api" className="rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="api-title">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
          <TerminalSquare className="h-5 w-5 text-emerald-600" />
        </span>
        <h2 id="api-title" className="text-xl font-extrabold tracking-tight">
          Stake Fish Engine API
        </h2>
        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
          UCI compatible
        </Badge>
      </div>
      <p className="max-w-3xl text-sm leading-relaxed text-neutral-600">
        <b>Stake Fish</b> is a chess engine that analyzes positions, evaluates them and finds the best
        move — it communicates with apps via the <b>UCI protocol</b> (the same API as{" "}
        <a href="https://github.com/official-stockfish/Stockfish" target="_blank" rel="noreferrer" className="text-emerald-700 underline">
          official-stockfish/Stockfish
        </a>
        ). This site runs the Stake Fish <b>web build</b> (WASM + NNUE) directly in your browser through a
        Web Worker bridge — see{" "}
        <a href="https://github.com/gefrus112/stake-fish-1.0" target="_blank" rel="noreferrer" className="text-emerald-700 underline">
          github.com/gefrus112/stake-fish-1.0
        </a>
        .
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* UCI */}
        <div className="rounded-xl border p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <Fish className="h-4 w-4 text-emerald-600" /> UCI commands
          </h3>
          <ul className="flex flex-col gap-2">
            {UCI_ROWS.map((r) => (
              <li key={r.cmd} className="rounded-lg bg-neutral-50 p-2">
                <code className="text-[11px] font-bold text-emerald-700">{r.cmd}</code>
                <p className="mt-0.5 text-xs text-neutral-600">{r.desc}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* JS bridge */}
        <div className="rounded-xl border p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <Globe className="h-4 w-4 text-emerald-600" /> Web Worker bridge
          </h3>
          <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-[11px] leading-relaxed text-emerald-200">
{`// 1. spawn the engine (same files the
//    extension uses)
const engine = new Worker(
  "/stockfish/stockfish-19-lite-single.js");

// 2. UCI handshake
engine.postMessage("uci");   // -> "uciok"
engine.postMessage("isready"); // -> "readyok"

// 3. analyze
engine.postMessage(
  "position fen rnbqkbnr/... w - - 0 1");
engine.postMessage("go depth 12");
// stream: "info depth 12 ... score cp 34
//          pv e2e4 ..." then "bestmove e2e4"`}
          </pre>
        </div>

        {/* REST */}
        <div className="rounded-xl border p-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
            <MessageSquareCode className="h-4 w-4 text-emerald-600" /> REST endpoints (this site)
          </h3>
          <div className="flex flex-col gap-2">
            <div className="rounded-lg bg-neutral-50 p-2">
              <code className="text-[11px] font-bold text-emerald-700">POST /api/import</code>
              <p className="text-xs text-neutral-600">
                {"{ url }"} → fetches a game from Lichess / Chess.com and returns its PGN.
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-2">
              <code className="text-[11px] font-bold text-emerald-700">POST /api/coach</code>
              <p className="text-xs text-neutral-600">
                {"{ fen, bestMove, scoreText }"} → GM-style commentary for the position.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-[11px] leading-relaxed text-emerald-200">
{`curl -X POST /api/import \\
  -H "Content-Type: application/json" \\
  -d '{"url":"lichess.org/q7ZvsdUF"}'`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
