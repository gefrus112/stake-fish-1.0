"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Chess } from "chess.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useEngine } from "@/hooks/use-engine";
import {
  EXAMPLE_PGN,
  START_FEN,
  classifyMove,
  formatScore,
  moveAccuracy,
  negateScore,
  parsePgnHeaders,
  safeChess,
  scoreToCp,
  uciToSan,
  winPercent,
  type Classification,
  type EngineScore,
  type PlayedMove,
  type PgnHeaders,
} from "@/lib/chess-utils";
import type { EngineLine } from "@/lib/engine/engine-client";
import { ChessBoard, type BoardMove } from "@/components/chess/chess-board";
import { EvalBar } from "@/components/chess/eval-bar";
import { EnginePanel } from "@/components/chess/engine-panel";
import { ReviewPanel } from "@/components/chess/review-panel";
import { ExtensionSection } from "@/components/chess/extension-section";
import { ApiDocsSection } from "@/components/chess/api-docs-section";
import { Copy, Download, FlipHorizontal2, Fish, RotateCcw, Undo2 } from "lucide-react";

type Mode = "live" | "review";

export default function Home() {
  const { toast } = useToast();
  const { status, statusDetail, info, analyze, stop } = useEngine();

  /* ---------------- core game state ---------------- */
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [viewPly, setViewPly] = useState(0);
  const [mode, setMode] = useState<Mode>("live");
  const [orientation, setOrientation] = useState<"white" | "black">("white");

  /* ---------------- settings ---------------- */
  const [depth, setDepth] = useState(12);
  const [multipv, setMultipv] = useState(3);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [advisorStyle, setAdvisorStyle] = useState<"gm" | "bot">("gm");

  /* ---------------- engine request tracking ---------------- */
  const [analyzedFen, setAnalyzedFen] = useState<string | null>(null);

  /* ---------------- coach ---------------- */
  const [coachText, setCoachText] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);

  /* ---------------- review state ---------------- */
  const [headers, setHeaders] = useState<PgnHeaders | null>(null);
  const [reviewEvals, setReviewEvals] = useState<(EngineLine | null)[]>([]);
  const [classes, setClasses] = useState<(Classification | null)[]>([]);
  const [accuracy, setAccuracy] = useState<{ white: number; black: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [importing, setImporting] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const cancelRef = useRef(false);

  /* ---------------- derived ---------------- */
  const viewFen = viewPly === 0 ? START_FEN : moves[viewPly - 1]?.fenAfter ?? START_FEN;
  const viewGame = useMemo(() => safeChess(viewFen), [viewFen]);
  const turn = viewGame.turn();
  const gameOver = viewGame.isGameOver();

  const lastMove = viewPly > 0 ? moves[viewPly - 1] ?? null : null;

  const liveFresh = mode === "live" && analyzedFen === viewFen && info && info.lines.length > 0;
  const liveLine: EngineLine | null = liveFresh ? info!.lines[0] ?? null : null;

  const reviewLine: EngineLine | null =
    mode === "review" && reviewEvals.length > 0 ? reviewEvals[viewPly] ?? null : null;

  const activeLine = mode === "review" ? reviewLine : liveLine;

  const whitePov: EngineScore = useMemo(() => {
    if (!activeLine) return { type: "cp", value: 0 };
    return turn === "w" ? activeLine.score : negateScore(activeLine.score);
  }, [activeLine, turn]);

  const arrowUci = gameOver ? null : activeLine?.pv?.[0] ?? null;

  const bestSan = useMemo(() => {
    if (!arrowUci) return null;
    return uciToSan(viewFen, arrowUci);
  }, [arrowUci, viewFen]);

  /* instant local GM-style phrase */
  const instantCoach = useMemo(() => {
    if (advisorStyle !== "gm" || !liveLine || !liveFresh) return null;
    const cp = turn === "w" ? scoreToCp(liveLine.score) : -scoreToCp(liveLine.score);
    const mv = bestSan ?? "";
    if (gameOver) return "Game over — reset the board and let's run it back!";
    if (cp >= 600) return `${mv}! This is completely winning — just don't hand it back.`;
    if (cp >= 120) return `${mv} — better for you. Keep the squeeze on!`;
    if (cp > -120) return `${mv} — dead equal, fight for every tempo.`;
    if (cp > -600) return `${mv} — a bit worse, solid moves only!`;
    return `${mv} — this is rough, stay solid and set traps.`;
  }, [advisorStyle, liveLine, liveFresh, turn, bestSan, gameOver]);

  const coachDisplay = advisorStyle === "gm" ? coachText ?? instantCoach : null;

  /* ---------------- analysis request ---------------- */
  const requestAnalysis = useCallback(
    async (fen: string) => {
      if (gameOverCheck(fen)) return;
      setAnalyzedFen(fen);
      try {
        await analyze(fen, { depth, multipv });
      } catch {
        /* engine error surfaced via status */
      }
    },
    [analyze, depth, multipv]
  );

  /* auto-analyze while playing */
  useEffect(() => {
    if (mode !== "live" || !autoAnalyze) return;
    if (status !== "ready") return;
    const t = setTimeout(() => void requestAnalysis(viewFen), 200);
    return () => clearTimeout(t);
  }, [viewFen, mode, autoAnalyze, status, requestAnalysis]);

  /* clear coach text when position changes */
  useEffect(() => {
    setCoachText(null);
  }, [viewFen]);

  /* ---------------- live actions ---------------- */
  function applyMove(mv: BoardMove) {
    if (mode !== "live") return;
    const g = safeChess(viewFen);
    let m;
    try {
      m = g.move({ from: mv.from, to: mv.to, promotion: mv.promotion ?? undefined });
    } catch {
      return;
    }
    const base = moves.slice(0, viewPly);
    const nm: PlayedMove = {
      san: m.san,
      from: m.from,
      to: m.to,
      promotion: m.promotion ?? undefined,
      uci: m.from + m.to + (m.promotion ?? ""),
      fenAfter: g.fen(),
      color: m.color,
    };
    setMoves([...base, nm]);
    setViewPly(base.length + 1);
    resetReviewResults();
  }

  function playBest() {
    if (!arrowUci) return;
    applyMove({ from: arrowUci.slice(0, 2), to: arrowUci.slice(2, 4), promotion: arrowUci.length > 4 ? arrowUci[4] : undefined });
  }

  function undo() {
    if (!moves.length) return;
    setMoves(moves.slice(0, -1));
    setViewPly(moves.length - 1);
    resetReviewResults();
  }

  function reset() {
    setMoves([]);
    setViewPly(0);
    resetReviewResults();
  }

  function resetReviewResults() {
    setReviewEvals([]);
    setClasses([]);
    setAccuracy(null);
    setSummaryText(null);
  }

  function copyFen() {
    navigator.clipboard?.writeText(viewFen).then(
      () => toast({ title: "FEN copied", description: viewFen }),
      () => toast({ title: "Couldn't copy FEN", variant: "destructive" })
    );
  }

  /* ---------------- coach API ---------------- */
  async function askCoach() {
    setCoachLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "position",
          fen: viewFen,
          bestMove: bestSan ?? "",
          scoreText: formatScore(whitePov),
        }),
      });
      const data = await res.json();
      setCoachText(data.ok ? data.text : "The coach is out of breath — try again in a second.");
    } catch {
      setCoachText("The coach lost connection — try again in a second.");
    } finally {
      setCoachLoading(false);
    }
  }

  /* ---------------- review import ---------------- */
  function loadPgn(pgn: string) {
    try {
      const c = new Chess();
      c.loadPgn(pgn);
      const hist = c.history({ verbose: true });
      if (!hist.length) throw new Error("no moves");
      const ms: PlayedMove[] = hist.map((m) => ({
        san: m.san,
        from: m.from,
        to: m.to,
        promotion: m.promotion ?? undefined,
        uci: m.from + m.to + (m.promotion ?? ""),
        fenAfter: m.after,
        color: m.color,
      }));
      setMoves(ms);
      setViewPly(0);
      setMode("review");
      setHeaders(parsePgnHeaders(pgn));
      resetReviewResults();
      toast({ title: "Game loaded", description: `${ms.length} moves — run the full game review.` });
    } catch {
      toast({ title: "Couldn't read that PGN", description: "Make sure it's a complete game in PGN format.", variant: "destructive" });
    }
  }

  async function importUrl(url: string) {
    setImporting(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({ title: "Couldn't fetch the game", description: data.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      loadPgn(data.pgn);
    } catch {
      toast({ title: "Network error", description: "Couldn't reach the import service — paste the PGN instead.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  function loadExample() {
    loadPgn(EXAMPLE_PGN);
  }

  /* ---------------- full game review ---------------- */
  const runAnalysis = useCallback(async () => {
    if (analyzing) return;
    const n = moves.length;
    if (!n) return;
    cancelRef.current = false;
    setAnalyzing(true);
    setProgress({ done: 0, total: n + 1 });

    const evals: (EngineLine | null)[] = new Array(n + 1).fill(null);
    const reviewDepth = Math.max(10, depth);
    try {
      for (let i = 0; i <= n; i++) {
        if (cancelRef.current) break;
        setProgress({ done: i + 1, total: n + 1 });
        const fen = i === 0 ? START_FEN : moves[i - 1].fenAfter;
        try {
          const res = await analyze(fen, { depth: reviewDepth, multipv: 1 });
          evals[i] = res.lines[0] ?? null;
        } catch {
          break;
        }
      }
    } finally {
      if (cancelRef.current) stop();
    }

    const cls: (Classification | null)[] = new Array(n).fill(null);
    const accs: { w: number[]; b: number[] } = { w: [], b: [] };
    for (let i = 0; i < n; i++) {
      const before = evals[i];
      const after = evals[i + 1];
      if (!before || !after) continue;
      const bestCp = scoreToCp(before.score);
      const playedCp = -scoreToCp(after.score);
      const delta = Math.max(0, bestCp - playedCp);
      const isBest = (before.pv?.[0] ?? "") === moves[i].uci;
      cls[i] = classifyMove(delta, isBest);
      accs[moves[i].color].push(moveAccuracy(winPercent(bestCp), winPercent(playedCp)));
    }
    setReviewEvals(evals);
    setClasses(cls);
    setAccuracy({
      white: accs.w.length ? accs.w.reduce((a, b) => a + b, 0) / accs.w.length : 100,
      black: accs.b.length ? accs.b.reduce((a, b) => a + b, 0) / accs.b.length : 100,
    });
    setAnalyzing(false);
    toast({ title: "Review complete", description: "Move quality, accuracy and the eval graph are ready." });
  }, [moves, analyzing, depth, analyze, stop, toast]);

  function cancelAnalysis() {
    cancelRef.current = true;
    stop();
  }

  async function askSummary() {
    if (!accuracy) return;
    setSummaryLoading(true);
    try {
      const mistakes: string[] = [];
      const scored: { i: number; delta: number }[] = [];
      for (let i = 0; i < moves.length; i++) {
        const before = reviewEvals[i];
        const after = reviewEvals[i + 1];
        if (!before || !after) continue;
        const delta = Math.max(0, scoreToCp(before.score) + scoreToCp(after.score));
        scored.push({ i, delta });
      }
      scored.sort((a, b) => b.delta - a.delta);
      for (const s of scored.slice(0, 3)) {
        const mv = moves[s.i];
        const fenBefore = s.i === 0 ? START_FEN : moves[s.i - 1].fenAfter;
        const bestSanMv = uciToSan(fenBefore, reviewEvals[s.i]?.pv?.[0] ?? "");
        mistakes.push(
          `move ${Math.floor(s.i / 2) + 1} ${mv.color === "w" ? "White" : "Black"} played ${mv.san} (${classes[s.i] ?? "mistake"}), best was ${bestSanMv ?? reviewEvals[s.i]?.pv?.[0] ?? "?"}`
        );
      }
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "summary",
          opening: headers?.Event,
          result: headers?.Result,
          whiteAccuracy: accuracy.white.toFixed(1),
          blackAccuracy: accuracy.black.toFixed(1),
          blunders: mistakes,
        }),
      });
      const data = await res.json();
      setSummaryText(data.ok ? data.text : "Summary unavailable right now.");
    } catch {
      setSummaryText("Summary unavailable right now.");
    } finally {
      setSummaryLoading(false);
    }
  }

  /* ---------------- misc ---------------- */
  const statusLine = useMemo(() => {
    if (viewGame.isCheckmate()) return `Checkmate — ${turn === "w" ? "Black" : "White"} wins`;
    if (viewGame.isStalemate()) return "Stalemate — draw";
    if (viewGame.isInsufficientMaterial()) return "Insufficient material — draw";
    if (viewGame.isDraw()) return "Draw";
    return `${turn === "w" ? "White" : "Black"} to move${viewGame.isCheck() ? " · Check!" : ""}`;
  }, [viewGame, turn]);

  const canPlayBest = mode === "live" && !gameOver && !!arrowUci && status === "ready";

  return (
    <div className="flex min-h-screen flex-col bg-[#fafaf7]">
      {/* ---------------- header ---------------- */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2.5">
          <Image
            src="/icon.png"
            alt="Stake Fish logo"
            width={42}
            height={42}
            className="rounded-xl border border-black/10 shadow-sm"
            priority
          />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
              Stake Fish
              <Badge className="bg-emerald-600 text-white">v1.0</Badge>
            </h1>
            <p className="truncate text-xs text-neutral-500">
              UCI chess analyzer &amp; live coach — link import, live best moves, Chrome/Edge extension
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden border-emerald-300 bg-emerald-50 text-emerald-700 sm:flex">
              <Fish className="mr-1 h-3 w-3" />
              {status === "ready" ? "Engine ready" : status === "thinking" ? "Thinking…" : status === "error" ? "Engine error" : "Loading engine…"}
            </Badge>
            <Button asChild size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
              <a href="/stake-fish-extension.zip" download>
                <Download className="h-3.5 w-3.5" /> Extension
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* ---------------- main ---------------- */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* board side */}
          <div className="flex flex-col gap-3">
            <div className="flex items-stretch gap-3">
              <EvalBar
                cpWhite={scoreToCp(whitePov)}
                label={formatScore(whitePov)}
                thinking={mode === "live" && status === "thinking"}
              />
              <div className="min-w-0 max-w-[640px] flex-1 basis-0">
                <ChessBoard
                  fen={viewFen}
                  orientation={orientation}
                  lastMove={lastMove}
                  bestArrowUci={arrowUci}
                  interactive={mode === "live" && !gameOver}
                  onMove={applyMove}
                />
              </div>
            </div>

            <div className="flex max-w-[640px] flex-wrap items-center gap-2 sm:ml-7">
              <span className="mr-auto text-sm font-semibold text-neutral-700" aria-live="polite">
                {statusLine}
              </span>
              <Button variant="outline" size="sm" onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}>
                <FlipHorizontal2 className="h-3.5 w-3.5" /> Flip
              </Button>
              <Button variant="outline" size="sm" onClick={undo} disabled={!moves.length || mode !== "live"}>
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </Button>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </Button>
              <Button variant="outline" size="sm" onClick={copyFen}>
                <Copy className="h-3.5 w-3.5" /> FEN
              </Button>
            </div>

            <p className="max-w-[640px] text-xs leading-relaxed text-neutral-500 sm:ml-7">
              Live coach: play moves on the board — Stake Fish analyzes every position instantly and draws the best
              move. Or switch to <b>Game Review</b> and paste a Lichess / Chess.com link.
            </p>
          </div>

          {/* side panel */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="live">
                <Fish className="mr-1 inline h-3.5 w-3.5" /> Live Coach
              </TabsTrigger>
              <TabsTrigger value="review">Game Review</TabsTrigger>
            </TabsList>
            <TabsContent value="live" className="mt-4">
              <EnginePanel
                status={status}
                statusDetail={statusDetail}
                info={info}
                fen={viewFen}
                analyzedFen={analyzedFen}
                depth={depth}
                onDepthChange={setDepth}
                multipv={multipv}
                onMultipvChange={setMultipv}
                autoAnalyze={autoAnalyze}
                onAutoAnalyzeChange={setAutoAnalyze}
                advisorStyle={advisorStyle}
                onAdvisorStyleChange={setAdvisorStyle}
                onAnalyzeNow={() => void requestAnalysis(viewFen)}
                onPlayBest={playBest}
                canPlayBest={canPlayBest}
                coachText={coachDisplay}
                coachLoading={coachLoading}
                onAskCoach={askCoach}
                turn={turn}
                gameOver={gameOver}
              />
            </TabsContent>
            <TabsContent value="review" className="mt-4">
              <ReviewPanel
                importing={importing}
                onImportUrl={importUrl}
                onLoadPgn={loadPgn}
                onLoadExample={loadExample}
                headers={headers}
                moves={moves}
                viewPly={viewPly}
                onSelectPly={setViewPly}
                analyzing={analyzing}
                progress={progress}
                onRunAnalysis={() => void runAnalysis()}
                onCancelAnalysis={cancelAnalysis}
                classes={classes}
                evals={reviewEvals}
                accuracy={accuracy}
                summaryText={summaryText}
                summaryLoading={summaryLoading}
                onAskSummary={askSummary}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* below the fold: extension + api */}
        <div className="mt-10 flex flex-col gap-6">
          <ExtensionSection />
          <ApiDocsSection />
        </div>
      </main>

      {/* ---------------- footer ---------------- */}
      <footer className="mt-auto border-t bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-1 px-4 py-4 text-center text-xs text-neutral-500">
          <p className="flex items-center gap-1.5 font-semibold text-neutral-700">
            <Fish className="h-3.5 w-3.5 text-emerald-600" /> Stake Fish 1.0 — web build of the Stake Fish UCI engine
          </p>
          <p>
            Stockfish 19 NNUE core (GPL-3.0) runs entirely in your browser · Engine:{" "}
            <a href="https://github.com/gefrus112/stake-fish-1.0" target="_blank" rel="noreferrer" className="underline hover:text-emerald-700">
              gefrus112/stake-fish-1.0
            </a>{" "}
            · Not affiliated with Chess.com or Lichess
          </p>
        </div>
      </footer>
    </div>
  );
}

function gameOverCheck(_fen: string): boolean {
  try {
    return safeChess(_fen).isGameOver();
  } catch {
    return false;
  }
}
