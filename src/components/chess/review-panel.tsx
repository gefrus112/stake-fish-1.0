"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CLASS_META, type Classification, type PlayedMove } from "@/lib/chess-utils";
import type { EngineLine } from "@/lib/engine/engine-client";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Loader2,
  Link as LinkIcon,
  Radio,
  Sparkles,
  Square,
  Trophy,
  XCircle,
} from "lucide-react";
import { MoveList } from "./move-list";
import { EvalGraph } from "./eval-graph";

export interface WatchInfo {
  lastSync: number;
  moves: number;
}

interface ReviewPanelProps {
  importing: boolean;
  onImportUrl: (url: string) => void;
  onLoadPgn: (pgn: string) => void;
  onLoadExample: () => void;
  headers: { White: string; Black: string; Result: string; Event: string } | null;
  moves: PlayedMove[];
  viewPly: number;
  onSelectPly: (ply: number) => void;
  analyzing: boolean;
  progress: { done: number; total: number };
  onRunAnalysis: () => void;
  onCancelAnalysis: () => void;
  classes: (Classification | null)[];
  evals: (EngineLine | null)[];
  accuracy: { white: number; black: number } | null;
  summaryText: string | null;
  summaryLoading: boolean;
  onAskSummary: () => void;
  watching: boolean;
  watchError: string | null;
  watchInfo: WatchInfo | null;
  onWatch: (url: string) => void;
  onStopWatch: () => void;
}

export function ReviewPanel(p: ReviewPanelProps) {
  const [url, setUrl] = useState("");
  const [pgn, setPgn] = useState("");

  const counts = {
    white: {} as Partial<Record<Classification, number>>,
    black: {} as Partial<Record<Classification, number>>,
  };
  p.moves.forEach((mv, i) => {
    const c = p.classes[i];
    if (!c) return;
    const bucket = mv.color === "w" ? counts.white : counts.black;
    bucket[c] = (bucket[c] ?? 0) + 1;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* import + live watch */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
          <LinkIcon className="h-4 w-4 text-blue-400" /> Watch a live game by link
        </h3>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="chess.com/game/186718258398 or lichess.org/…"
            className="h-9 flex-1 border-white/10 bg-white/5 text-xs text-white placeholder:text-blue-200/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim() && !p.watching) p.onWatch(url.trim());
            }}
          />
          {p.watching ? (
            <Button
              size="sm"
              variant="outline"
              className="h-9 border-red-400/40 text-red-300 hover:bg-red-500/10"
              onClick={p.onStopWatch}
            >
              <XCircle className="h-4 w-4" /> Stop
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-9 bg-blue-500 text-white hover:bg-blue-400"
              onClick={() => url.trim() && p.onWatch(url.trim())}
              disabled={p.importing}
            >
              {p.importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              Watch live
            </Button>
          )}
        </div>

        {p.watching && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
            </span>
            Live — polling every 6s
            {p.watchInfo && (
              <span className="ml-auto tabular-nums text-blue-300/70">
                {p.watchInfo.moves} moves · synced{" "}
                {new Date(p.watchInfo.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
          </div>
        )}
        {p.watchError && (
          <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {p.watchError}
          </p>
        )}
        <p className="mt-2 text-[11px] leading-relaxed text-blue-200/40">
          The site polls the game, mirrors every move both players make onto the board, and shows the best
          move for the side to move — your live second screen.
        </p>

        <div className="my-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-blue-200/30">
          <Separator className="flex-1 bg-white/10" /> or paste PGN <Separator className="flex-1 bg-white/10" />
        </div>
        <textarea
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          placeholder={"[Event …]\n1. e4 e5 2. Nf3 …"}
          className="h-20 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-2 font-mono text-xs text-white placeholder:text-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-white/15 text-slate-200 hover:bg-white/10"
            onClick={() => pgn.trim() && p.onLoadPgn(pgn.trim())}
          >
            Load PGN
          </Button>
          <Button size="sm" variant="ghost" className="flex-1 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200" onClick={p.onLoadExample}>
            <Download className="h-3.5 w-3.5" /> Load example
          </Button>
        </div>
      </div>

      {/* game header */}
      {p.headers && (
        <div className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-950/70 to-[#060b16] p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-bold text-white">{p.headers.White}</span>
            <Badge variant="outline" className="flex-none border-blue-400/30 text-[10px] text-blue-200">
              {p.headers.Result}
            </Badge>
            <span className="truncate font-bold text-white">{p.headers.Black}</span>
          </div>
          <div className="mt-0.5 truncate text-center text-[11px] text-blue-200/40">{p.headers.Event}</div>
        </div>
      )}

      {/* full analysis */}
      <div>
        {p.analyzing ? (
          <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-blue-200">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Stake Fish reviewing… {p.progress.done}/{p.progress.total}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-blue-200 hover:bg-blue-500/20"
                onClick={p.onCancelAnalysis}
              >
                <Square className="h-3 w-3" /> Stop
              </Button>
            </div>
            <Progress value={p.progress.total ? (p.progress.done / p.progress.total) * 100 : 0} className="h-2" />
          </div>
        ) : (
          <Button
            className="w-full bg-blue-500 text-white hover:bg-blue-400"
            onClick={p.onRunAnalysis}
            disabled={p.moves.length === 0}
          >
            <Sparkles className="h-4 w-4" />
            {p.evals.some(Boolean) ? "Re-run full game review" : "Run full game review"}
          </Button>
        )}
      </div>

      {/* accuracy summary */}
      {p.accuracy && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white">
            <Trophy className="h-4 w-4 text-amber-400" /> Game report
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            {(["white", "black"] as const).map((side) => (
              <div
                key={side}
                className={`rounded-lg p-2 ${
                  side === "white" ? "bg-slate-100 text-slate-900" : "bg-[#0b1526] text-white"
                }`}
              >
                <div className="text-lg font-extrabold tabular-nums">{p.accuracy![side].toFixed(1)}%</div>
                <div className="text-[10px] uppercase tracking-wide opacity-70">{side} accuracy</div>
              </div>
            ))}
          </div>
          {(["white", "black"] as const).map((side) => {
            const bucket = counts[side];
            const entries = Object.entries(bucket);
            if (!entries.length) return null;
            return (
              <div key={side} className="mt-2 flex flex-wrap gap-1">
                {entries.map(([cls, n]) => (
                  <Badge key={cls} variant="outline" className={`text-[10px] ${CLASS_META[cls as Classification].badge}`}>
                    {CLASS_META[cls as Classification].label} ×{n}
                  </Badge>
                ))}
              </div>
            );
          })}
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full border-blue-400/30 text-blue-300 hover:bg-blue-500/10"
            onClick={p.onAskSummary}
            disabled={p.summaryLoading}
          >
            {p.summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            GM Coach summary (AI)
          </Button>
          {p.summaryText && (
            <p className="mt-2 rounded-lg bg-blue-500/10 p-2 text-xs leading-relaxed text-blue-100">{p.summaryText}</p>
          )}
        </div>
      )}

      {/* graph */}
      <EvalGraph evals={p.evals} viewPly={p.viewPly} onSelectPly={p.onSelectPly} />

      {/* moves */}
      <MoveList moves={p.moves} classes={p.classes} viewPly={p.viewPly} onSelectPly={p.onSelectPly} />

      {/* navigation */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-white/10 text-slate-200 hover:bg-white/10"
          onClick={() => p.onSelectPly(0)}
          aria-label="Go to start"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-white/10 text-slate-200 hover:bg-white/10"
          onClick={() => p.onSelectPly(Math.max(0, p.viewPly - 1))}
          aria-label="Previous move"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-white/10 text-slate-200 hover:bg-white/10"
          onClick={() => p.onSelectPly(Math.min(p.moves.length, p.viewPly + 1))}
          aria-label="Next move"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 border-white/10 text-slate-200 hover:bg-white/10"
          onClick={() => p.onSelectPly(p.moves.length)}
          aria-label="Go to end"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
