"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Bot, Fish, Loader2, Sparkles, Play } from "lucide-react";
import { formatScore, negateScore, pvToSan, type EngineScore } from "@/lib/chess-utils";
import type { EngineInfo, EngineStatus } from "@/lib/engine/engine-client";

interface EnginePanelProps {
  status: EngineStatus;
  statusDetail?: string;
  info: EngineInfo | null;
  fen: string; // fen being displayed (must match analysis for lines/arrow)
  analyzedFen: string | null;
  depth: number;
  onDepthChange: (d: number) => void;
  multipv: number;
  onMultipvChange: (m: number) => void;
  autoAnalyze: boolean;
  onAutoAnalyzeChange: (v: boolean) => void;
  advisorStyle: "gm" | "bot";
  onAdvisorStyleChange: (s: "gm" | "bot") => void;
  onAnalyzeNow: () => void;
  onPlayBest: () => void;
  canPlayBest: boolean;
  coachText: string | null;
  coachLoading: boolean;
  onAskCoach: () => void;
  turn: "w" | "b";
  gameOver: boolean;
}

const STATUS_TEXT: Record<EngineStatus, string> = {
  idle: "Waking up…",
  loading: "Loading NNUE nets…",
  ready: "Ready — analyzing positions instantly",
  thinking: "Calculating…",
  error: "Engine failed to start",
};

export function EnginePanel(p: EnginePanelProps) {
  const turnLabel = p.turn === "w" ? "White" : "Black";

  const lines = useMemo(() => {
    if (!p.info || p.analyzedFen !== p.fen) return [];
    return p.info.lines.slice(0, p.multipv);
  }, [p.info, p.analyzedFen, p.fen, p.multipv]);

  return (
    <div className="flex flex-col gap-4">
      {/* engine status */}
      <div className="rounded-xl border bg-[#1c1c1a] p-4 text-[#fafaf5] shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
            <Fish className="h-4.5 w-4.5 text-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-bold">
              Stake Fish 1.0
              {p.status === "thinking" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              ) : (
                <span className={`h-2 w-2 rounded-full ${p.status === "ready" ? "bg-emerald-400" : "bg-amber-400"}`} />
              )}
            </div>
            <div className="truncate text-xs text-neutral-400">
              {p.status === "error" ? (p.statusDetail ?? STATUS_TEXT.error) : STATUS_TEXT[p.status]}
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px]">
            UCI · NNUE
          </Badge>
        </div>
        {p.info && p.info.nodes > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-neutral-300">
            <div className="rounded-lg bg-white/5 py-1.5">
              <div className="font-bold text-white tabular-nums">{p.info.depth}</div>
              <div className="text-[10px] text-neutral-500">depth</div>
            </div>
            <div className="rounded-lg bg-white/5 py-1.5">
              <div className="font-bold text-white tabular-nums">{formatNodes(p.info.nodes)}</div>
              <div className="text-[10px] text-neutral-500">nodes</div>
            </div>
            <div className="rounded-lg bg-white/5 py-1.5">
              <div className="font-bold text-white tabular-nums">{formatNps(p.info.nps)}</div>
              <div className="text-[10px] text-neutral-500">nps</div>
            </div>
          </div>
        )}
      </div>

      {/* best lines */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold">
            {p.advisorStyle === "gm" ? "GM recommendation" : "Best lines"}
          </h3>
          <span className="text-xs text-muted-foreground">for {turnLabel} to move</span>
        </div>
        {lines.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            {p.gameOver
              ? "Game over — reset or flip the board to keep analyzing."
              : p.autoAnalyze
                ? p.status === "ready"
                  ? "Watching every move you play…"
                  : "Waiting for the engine…"
                : "Auto-analyze is off. Press “Analyze now”."}
          </div>
        ) : (
          <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto pr-1">
            {lines.map((line) => {
              const whitePov = p.turn === "w" ? line.score : negateScore(line.score);
              const sanLine = pvToSan(p.fen, line.pv, 9).join(" ");
              const scoreLabel = formatScore(whitePov);
              return (
                <li
                  key={line.multipv}
                  className="flex items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-sm shadow-sm"
                >
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded bg-neutral-900 text-[10px] font-bold text-white">
                    {line.multipv}
                  </span>
                  <ScoreChip score={whitePov} label={scoreLabel} />
                  <span className="truncate text-xs text-neutral-600 sm:text-[13px]" title={sanLine}>
                    {sanLine || "…"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* GM coach text */}
      {p.advisorStyle === "gm" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <Sparkles className="h-3.5 w-3.5" /> GM Coach says
          </div>
          <p className="min-h-10 text-sm text-emerald-900">
            {p.coachText ?? "Flip on auto-analyze and play a move — I'll tell you what I'd play (and why)."}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
            onClick={p.onAskCoach}
            disabled={p.coachLoading}
          >
            {p.coachLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Ask the GM Coach (AI)
          </Button>
        </div>
      )}

      {/* actions */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={p.onPlayBest}
          disabled={!p.canPlayBest || p.status === "error"}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Play className="h-3.5 w-3.5" /> Play best move
        </Button>
        <Button size="sm" variant="outline" onClick={p.onAnalyzeNow} disabled={p.status === "error"}>
          <Bot className="h-3.5 w-3.5" /> Analyze now
        </Button>
      </div>

      {/* settings */}
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto" className="text-xs font-semibold text-muted-foreground">
            Auto-analyze while playing
          </Label>
          <Switch id="auto" checked={p.autoAnalyze} onCheckedChange={p.onAutoAnalyzeChange} />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground">Search depth</Label>
            <span className="text-xs font-bold tabular-nums">{p.depth}</span>
          </div>
          <Slider value={[p.depth]} min={8} max={18} step={1} onValueChange={(v) => p.onDepthChange(v[0] ?? 12)} />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground">Lines shown</Label>
          <Select value={String(p.multipv)} onValueChange={(v) => p.onMultipvChange(Number(v))}>
            <SelectTrigger className="h-8 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
              <SelectItem value="3">3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-muted-foreground">Advisor style</Label>
          <Select value={p.advisorStyle} onValueChange={(v) => p.onAdvisorStyleChange(v as "gm" | "bot")}>
            <SelectTrigger className="h-8 w-[190px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gm">♟ GM Coach (hype)</SelectItem>
              <SelectItem value="bot">🤖 Bot moves (plain)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function ScoreChip({ score, label }: { score: EngineScore; label: string }) {
  const whiteBetter = score.type === "mate" ? score.value > 0 : score.value >= 0;
  const isMate = score.type === "mate";
  return (
    <span
      className={`flex-none rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
        whiteBetter
          ? isMate
            ? "bg-emerald-600 text-white"
            : "bg-neutral-900 text-white"
          : isMate
            ? "bg-red-600 text-white"
            : "bg-neutral-200 text-neutral-800"
      }`}
    >
      {label}
    </span>
  );
}

function formatNodes(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

function formatNps(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}
