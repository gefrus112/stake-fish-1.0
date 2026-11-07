"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CLASS_META, type Classification, type PlayedMove } from "@/lib/chess-utils";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Loader2,
  Link as LinkIcon,
  Sparkles,
  Square,
  Trophy,
} from "lucide-react";
import { MoveList } from "./move-list";
import { EvalGraph } from "./eval-graph";

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
  evals: (import("@/lib/engine/engine-client").EngineLine | null)[];
  accuracy: { white: number; black: number } | null;
  summaryText: string | null;
  summaryLoading: boolean;
  onAskSummary: () => void;
}

export function ReviewPanel(p: ReviewPanelProps) {
  const [url, setUrl] = useState("");
  const [pgn, setPgn] = useState("");

  const counts = { white: {} as Partial<Record<Classification, number>>, black: {} as Partial<Record<Classification, number>> };
  p.moves.forEach((mv, i) => {
    const c = p.classes[i];
    if (!c) return;
    const bucket = mv.color === "w" ? counts.white : counts.black;
    bucket[c] = (bucket[c] ?? 0) + 1;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* import */}
      <div className="rounded-xl border p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
          <LinkIcon className="h-4 w-4 text-emerald-600" /> Analyze a game by link
        </h3>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="lichess.org/… or chess.com/game/live/…"
            className="h-9 flex-1 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter" && url.trim()) p.onImportUrl(url.trim());
            }}
          />
          <Button size="sm" className="h-9 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => url.trim() && p.onImportUrl(url.trim())} disabled={p.importing}>
            {p.importing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
          </Button>
        </div>
        <div className="my-3 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          <Separator className="flex-1" /> or paste PGN <Separator className="flex-1" />
        </div>
        <textarea
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          placeholder={"[Event …]\n1. e4 e5 2. Nf3 …"}
          className="h-20 w-full resize-none rounded-lg border bg-white p-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <div className="mt-2 flex gap-2">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => pgn.trim() && p.onLoadPgn(pgn.trim())}>
            Load PGN
          </Button>
          <Button size="sm" variant="ghost" className="flex-1" onClick={p.onLoadExample}>
            <Download className="h-3.5 w-3.5" /> Load example
          </Button>
        </div>
      </div>

      {/* game header */}
      {p.headers && (
        <div className="rounded-xl border bg-[#1c1c1a] p-3 text-[#fafaf5]">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-bold">{p.headers.White}</span>
            <Badge variant="outline" className="flex-none border-white/20 text-[10px] text-neutral-300">
              {p.headers.Result}
            </Badge>
            <span className="truncate font-bold">{p.headers.Black}</span>
          </div>
          <div className="mt-0.5 truncate text-center text-[11px] text-neutral-400">{p.headers.Event}</div>
        </div>
      )}

      {/* full analysis */}
      <div>
        {p.analyzing ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Stake Fish reviewing… {p.progress.done}/{p.progress.total}
              </span>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-emerald-800 hover:bg-emerald-100" onClick={p.onCancelAnalysis}>
                <Square className="h-3 w-3" /> Stop
              </Button>
            </div>
            <Progress value={p.progress.total ? (p.progress.done / p.progress.total) * 100 : 0} className="h-2" />
          </div>
        ) : (
          <Button
            className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
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
        <div className="rounded-xl border p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-bold">
            <Trophy className="h-4 w-4 text-amber-500" /> Game report
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            {(["white", "black"] as const).map((side) => (
              <div key={side} className={`rounded-lg p-2 ${side === "white" ? "bg-neutral-100" : "bg-neutral-900 text-white"}`}>
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
            className="mt-3 w-full border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            onClick={p.onAskSummary}
            disabled={p.summaryLoading}
          >
            {p.summaryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            GM Coach summary (AI)
          </Button>
          {p.summaryText && (
            <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs leading-relaxed text-emerald-900">{p.summaryText}</p>
          )}
        </div>
      )}

      {/* graph */}
      <EvalGraph evals={p.evals} viewPly={p.viewPly} onSelectPly={p.onSelectPly} />

      {/* moves */}
      <MoveList moves={p.moves} classes={p.classes} viewPly={p.viewPly} onSelectPly={p.onSelectPly} />

      {/* navigation */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={() => p.onSelectPly(0)} aria-label="Go to start">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => p.onSelectPly(Math.max(0, p.viewPly - 1))} aria-label="Previous move">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => p.onSelectPly(Math.min(p.moves.length, p.viewPly + 1))} aria-label="Next move">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={() => p.onSelectPly(p.moves.length)} aria-label="Go to end">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
