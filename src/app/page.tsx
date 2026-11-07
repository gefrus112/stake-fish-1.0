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
import { ReviewPanel, type WatchInfo } from "@/components/chess/review-panel";
import { JESSIE_LEVELS, JessiePanel, jessieLine, type JessieLevel } from "@/components/chess/jessie-panel";
import { ApiDocsSection } from "@/components/chess/api-docs-section";
import { BlogSection } from "@/components/chess/blog-section";
import { DownloadSection } from "@/components/chess/download-section";
import { MatrixRain } from "@/components/chess/matrix-rain";
import { Copy, Download, FlipHorizontal2, Fish, RotateCcw, Undo2 } from "lucide-react";

type SiteTab = "home" | "docs" | "blog" | "download";
type Panel = "coach" | "jessie" | "watch";

export default function Home() {
  const { toast } = useToast();
  const { status, statusDetail, info, analyze, stop } = useEngine();

  /* ---------------- site tabs ---------------- */
  const [siteTab, setSiteTab] = useState<SiteTab>("home");
  const [panel, setPanel] = useState<Panel>("coach");

  /* ---------------- core game state ---------------- */
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [viewPly, setViewPly] = useState(0);
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

  /* ---------------- review / watch state ---------------- */
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

  /* ---------------- watch-live state ---------------- */
  const [watching, setWatching] = useState(false);
  const [watchError, setWatchError] = useState<string | null>(null);
  const [watchInfo, setWatchInfo] = useState<WatchInfo | null>(null);
  const watchUrlRef = useRef<string>("");
  const watchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const movesRef = useRef<PlayedMove[]>([]);
  useEffect(() => {
    movesRef.current = moves;
  }, [moves]);

  /* ---------------- jessie state ---------------- */
  const [jessieLevel, setJessieLevel] = useState<JessieLevel>(JESSIE_LEVELS[2]);
  const [jessieSide, setJessieSide] = useState<"w" | "b">("b"); // Jessie's color
  const [jessieThinking, setJessieThinking] = useState(false);
  const [jessieSpeech, setJessieSpeech] = useState<string>(jessieLine("idle"));
  const [jessieResigned, setJessieResigned] = useState(false);
  const jessieSeqRef = useRef(0);
  const userColor: "w" | "b" = jessieSide === "w" ? "b" : "w";

  /* ---------------- derived ---------------- */
  const viewFen = viewPly === 0 ? START_FEN : moves[viewPly - 1]?.fenAfter ?? START_FEN;
  const viewGame = useMemo(() => safeChess(viewFen), [viewFen]);
  const turn = viewGame.turn();
  const gameOver = viewGame.isGameOver();

  const lastMove = viewPly > 0 ? moves[viewPly - 1] ?? null : null;

  const liveFresh = info && analyzedFen === viewFen && info.lines.length > 0;
  const liveLine: EngineLine | null = liveFresh ? info!.lines[0] ?? null : null;
  const reviewLine: EngineLine | null =
    panel === "watch" && reviewEvals.length > 0 ? reviewEvals[viewPly] ?? null : null;

  const activeLine: EngineLine | null =
    panel === "jessie" ? null : panel === "watch" ? reviewLine ?? liveLine : liveLine;

  const whitePov: EngineScore = useMemo(() => {
    if (!activeLine) return { type: "cp", value: 0 };
    return turn === "w" ? activeLine.score : negateScore(activeLine.score);
  }, [activeLine, turn]);

  const arrowUci = gameOver || panel === "jessie" ? null : activeLine?.pv?.[0] ?? null;

  const bestSan = useMemo(() => {
    if (!arrowUci) return null;
    return uciToSan(viewFen, arrowUci);
  }, [arrowUci, viewFen]);

  /* instant local GM-style phrase (live coach) */
  const instantCoach = useMemo(() => {
    if (advisorStyle !== "gm" || !liveLine || !liveFresh || panel !== "coach") return null;
    const cp = turn === "w" ? scoreToCp(liveLine.score) : -scoreToCp(liveLine.score);
    const mv = bestSan ?? "";
    if (gameOver) return "Game over — reset the board and let's run it back!";
    if (cp >= 600) return `${mv}! This is completely winning — just don't hand it back.`;
    if (cp >= 120) return `${mv} — better for you. Keep the squeeze on!`;
    if (cp > -120) return `${mv} — dead equal, fight for every tempo.`;
    if (cp > -120 && cp <= 120) return `${mv} — dead equal, fight for every tempo.`;
    if (cp > -600) return `${mv} — a bit worse, solid moves only!`;
    return `${mv} — this is rough, stay solid and set traps.`;
  }, [advisorStyle, liveLine, liveFresh, turn, bestSan, gameOver, panel]);

  const coachDisplay = advisorStyle === "gm" ? coachText ?? instantCoach : null;

  /* ---------------- analysis request ---------------- */
  const requestAnalysis = useCallback(
    async (fen: string) => {
      try {
        if (safeChess(fen).isGameOver()) return;
      } catch {
        return;
      }
      setAnalyzedFen(fen);
      try {
        await analyze(fen, { depth, multipv });
      } catch {
        /* surfaced via status */
      }
    },
    [analyze, depth, multipv]
  );

  /* auto-analyze while playing (live coach mode) */
  useEffect(() => {
    if (panel !== "coach" || !autoAnalyze) return;
    if (status !== "ready") return;
    const t = setTimeout(() => void requestAnalysis(viewFen), 200);
    return () => clearTimeout(t);
  }, [viewFen, panel, autoAnalyze, status, requestAnalysis]);

  /* clear coach text when position changes */
  useEffect(() => {
    setCoachText(null);
  }, [viewFen]);

  /* ---------------- moves ---------------- */
  function resetReviewResults() {
    setReviewEvals([]);
    setClasses([]);
    setAccuracy(null);
    setSummaryText(null);
  }

  function applyEngineMoveUci(fenBefore: string, uci: string): boolean {
    const g = safeChess(fenBefore);
    let m;
    try {
      m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
    } catch {
      return false;
    }
    const cutIdx = fenBefore === START_FEN ? -1 : movesRef.current.findIndex((mv) => mv.fenAfter === fenBefore);
    const prefix = cutIdx >= 0 ? movesRef.current.slice(0, cutIdx + 1) : [];
    const nm: PlayedMove = {
      san: m.san,
      from: m.from,
      to: m.to,
      promotion: m.promotion ?? undefined,
      uci: m.from + m.to + (m.promotion ?? ""),
      fenAfter: g.fen(),
      color: m.color,
    };
    setMoves([...prefix, nm]);
    setViewPly(prefix.length + 1);
    resetReviewResults();
    return true;
  }

  function applyMove(mv: BoardMove) {
    if (siteTab !== "home") return;
    if (panel === "watch") return;
    if (panel === "jessie") {
      if (jessieResigned || gameOver || turn !== userColor || jessieThinking) return;
    }
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
    const nextMoves = [...base, nm];
    setMoves(nextMoves);
    setViewPly(base.length + 1);
    resetReviewResults();

    if (panel === "jessie") {
      if (g.isGameOver()) {
        finishJessieGame(g);
      } else if (m.color === userColor) {
        void jessieTurn(g.fen());
      }
    }
  }

  /* ---------------- jessie bot ---------------- */
  const jessieTurn = useCallback(
    async (fen: string) => {
      const seq = ++jessieSeqRef.current;
      setJessieThinking(true);
      setJessieSpeech(jessieLine("thinking"));
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 700));
      if (seq !== jessieSeqRef.current) return;
      try {
        const res = await analyze(fen, { depth: jessieLevel.depth, multipv: 1, skill: jessieLevel.skill });
        if (seq !== jessieSeqRef.current) return;
        const uci = res.bestmove;
        setJessieThinking(false);
        if (uci && uci !== "(none)") {
          applyEngineMoveUci(fen, uci);
          setJessieSpeech(jessieLine("moved"));
          const gAfter = safeChess(fen);
          try {
            gAfter.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
            if (gAfter.isGameOver()) finishJessieGame(gAfter);
          } catch {
            /* ignore */
          }
        } else {
          setJessieSpeech("I have no good moves left… it's rough out here!");
        }
      } catch {
        setJessieThinking(false);
        setJessieSpeech("My engine hiccuped — try again!");
      }
    },
     
    [analyze, jessieLevel]
  );

  function finishJessieGame(g: Chess) {
    setJessieThinking(false);
    if (g.isCheckmate()) {
      const winner = g.turn() === "w" ? "b" : "w";
      if (winner === userColor) {
        setJessieSpeech(jessieLine("lose"));
        toast({ title: "You beat Jessie! 🎉", description: `${jessieLevel.label} Jessie has been splashed.` });
      } else {
        setJessieSpeech(jessieLine("win"));
        toast({ title: "Jessie wins this one", description: "Rematch? She's waiting…", variant: "destructive" });
      }
    } else {
      setJessieSpeech(jessieLine("draw"));
      toast({ title: "Draw game" });
    }
  }

  function jessieRestart() {
    jessieSeqRef.current++;
    setJessieThinking(false);
    setJessieResigned(false);
    setMoves([]);
    setViewPly(0);
    resetReviewResults();
    setJessieSpeech(jessieLine("idle"));
    if (jessieSide === "w") {
      setTimeout(() => void jessieTurn(START_FEN), 700);
    }
  }

  function jessieResign() {
    jessieSeqRef.current++;
    setJessieThinking(false);
    setJessieResigned(true);
    setJessieSpeech(jessieLine("win"));
  }

  /* engine plays first when Jessie takes White */
  useEffect(() => {
    if (panel !== "jessie") return;
    if (moves.length === 0 && jessieSide === "w" && !jessieResigned && !jessieThinking && status === "ready") {
      const t = setTimeout(() => void jessieTurn(START_FEN), 500);
      return () => clearTimeout(t);
    }
     
  }, [panel, jessieSide, status]);

  /* ---------------- live coach actions ---------------- */
  function playBest() {
    if (!arrowUci) return;
    applyMove({
      from: arrowUci.slice(0, 2),
      to: arrowUci.slice(2, 4),
      promotion: arrowUci.length > 4 ? arrowUci[4] : undefined,
    });
  }

  function undo() {
    if (!moves.length || panel === "watch") return;
    if (panel === "jessie") {
      // remove moves until it's the user's turn again
      const cut = Math.max(0, moves.length - (turn === userColor ? 2 : 1));
      setMoves(moves.slice(0, cut));
      setViewPly(cut);
    } else {
      setMoves(moves.slice(0, -1));
      setViewPly(moves.length - 1);
    }
    resetReviewResults();
  }

  function reset() {
    setMoves([]);
    setViewPly(0);
    resetReviewResults();
    if (panel === "jessie") jessieRestart();
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

  /* ---------------- PGN import ---------------- */
  function parsePgnToMoves(pgn: string): PlayedMove[] | null {
    try {
      const c = new Chess();
      c.loadPgn(pgn);
      const hist = c.history({ verbose: true });
      if (!hist.length) return null;
      return hist.map((m) => ({
        san: m.san,
        from: m.from,
        to: m.to,
        promotion: m.promotion ?? undefined,
        uci: m.from + m.to + (m.promotion ?? ""),
        fenAfter: m.after,
        color: m.color,
      }));
    } catch {
      return null;
    }
  }

  function loadPgn(pgn: string, opts: { silent?: boolean; follow?: boolean } = {}) {
    const ms = parsePgnToMoves(pgn);
    if (!ms) {
      if (!opts.silent) {
        toast({
          title: "Couldn't read that PGN",
          description: "Make sure it's a complete game in PGN format.",
          variant: "destructive",
        });
      }
      return false;
    }
    setMoves(ms);
    setViewPly(opts.follow ? ms.length : 0);
    setPanel("watch");
    setHeaders(parsePgnHeaders(pgn));
    resetReviewResults();
    if (!opts.silent) {
      toast({ title: "Game loaded", description: `${ms.length} moves — run the full game review.` });
    }
    return true;
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
      toast({
        title: "Network error",
        description: "Couldn't reach the import service — paste the PGN instead.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  }

  function loadExample() {
    loadPgn(EXAMPLE_PGN);
  }

  /* ---------------- watch live (poll) ---------------- */
  const pollWatch = useCallback(
    async (silentFail = false) => {
      const url = watchUrlRef.current;
      if (!url) return;
      try {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (!silentFail) setWatchError(data.error ?? "Couldn't reach the game.");
          return;
        }
        setWatchError(null);
        const pgn: string = data.pgn;
        const ms = parsePgnToMoves(pgn);
        if (!ms) return;
        const prevLen = movesRef.current.length;
        const hdrs = parsePgnHeaders(pgn);
        setHeaders(hdrs);
        setWatchInfo({ lastSync: Date.now(), moves: ms.length });
        if (ms.length !== prevLen || prevLen === 0) {
          setMoves(ms);
          setViewPly(ms.length); // follow the live action
          resetReviewResults();
          const lastFen = ms.length ? ms[ms.length - 1].fenAfter : START_FEN;
          void requestAnalysis(lastFen);
        }
        if (hdrs.Result && hdrs.Result !== "*") {
          stopWatch();
          toast({ title: "Game finished", description: `Final result: ${hdrs.Result}` });
        }
      } catch {
        if (!silentFail) setWatchError("Network error while polling the game.");
      }
    },
     
    [requestAnalysis, toast]
  );

  function startWatch(url: string) {
    watchUrlRef.current = url;
    setWatching(true);
    setWatchError(null);
    setPanel("watch");
    void pollWatch(true);
    if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    watchTimerRef.current = setInterval(() => void pollWatch(true), 6000);
    toast({ title: "Watching live", description: "New moves appear on the board automatically." });
  }

  function stopWatch() {
    if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    watchTimerRef.current = null;
    setWatching(false);
  }

  useEffect(() => {
    return () => {
      if (watchTimerRef.current) clearInterval(watchTimerRef.current);
    };
  }, []);

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
    if (panel === "jessie" && jessieResigned) return "You resigned — Jessie wins";
    if (viewGame.isCheckmate()) return `Checkmate — ${turn === "w" ? "Black" : "White"} wins`;
    if (viewGame.isStalemate()) return "Stalemate — draw";
    if (viewGame.isInsufficientMaterial()) return "Insufficient material — draw";
    if (viewGame.isDraw()) return "Draw";
    return `${turn === "w" ? "White" : "Black"} to move${viewGame.isCheck() ? " · Check!" : ""}`;
  }, [viewGame, turn, panel, jessieResigned]);

  const canPlayBest = panel === "coach" && !gameOver && !!arrowUci && status === "ready";
  const boardInteractive =
    siteTab === "home" &&
    ((panel === "coach" && !gameOver) ||
      (panel === "jessie" && !gameOver && !jessieResigned && turn === userColor && !jessieThinking));

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-b from-[#04070f] via-[#071120] to-[#04070f] text-slate-100">
      <MatrixRain />
      {/* liquid blue glow blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -left-32 top-[-10%] h-[420px] w-[420px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[30%] h-[380px] w-[380px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[30%] h-[420px] w-[420px] rounded-full bg-blue-800/25 blur-[130px]" />
      </div>

      {/* ---------------- header ---------------- */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#060b16]/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
          <button type="button" onClick={() => setSiteTab("home")} className="flex items-center gap-2.5 text-left">
            <Image
              src="/icon.png"
              alt="Stake Fish logo"
              width={42}
              height={42}
              className="rounded-xl border border-blue-400/30 shadow-lg shadow-blue-500/20"
              priority
            />
            <span>
              <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
                Stake Fish
                <Badge className="border-0 bg-blue-500 text-white">v1.2</Badge>
              </span>
              <span className="block text-[11px] text-blue-200/50">
                UCI chess analyzer · live link coach · Jessie bot · Chrome/Edge/OperaGX extension
              </span>
            </span>
          </button>

          <nav className="order-3 w-full sm:order-none sm:ml-4 sm:w-auto" aria-label="Site">
            <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
              {(
                [
                  ["home", "Home"],
                  ["docs", "Docs"],
                  ["blog", "Blog"],
                  ["download", "Download"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSiteTab(key)}
                  aria-current={siteTab === key ? "page" : undefined}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors sm:text-[13px] ${
                    siteTab === key
                      ? "bg-blue-500/25 text-blue-200 shadow-inner shadow-blue-500/10"
                      : "text-blue-100/50 hover:bg-white/5 hover:text-blue-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden border-blue-400/30 bg-blue-500/10 text-blue-300 sm:flex"
            >
              <Fish className="mr-1 h-3 w-3" />
              {status === "ready" ? "Engine ready" : status === "thinking" ? "Thinking…" : status === "error" ? "Engine error" : "Loading engine…"}
            </Badge>
            <Button asChild size="sm" className="bg-blue-500 text-white hover:bg-blue-400">
              <a href="/stake-fish-extension.zip" download>
                <Download className="h-3.5 w-3.5" /> Extension
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* ---------------- main ---------------- */}
      <main className="relative z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        {siteTab === "home" && (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            {/* board side */}
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur sm:p-4">
                <div className="flex items-stretch gap-3">
                  <EvalBar
                    cpWhite={scoreToCp(whitePov)}
                    label={formatScore(whitePov)}
                    thinking={status === "thinking" && analyzedFen === viewFen}
                  />
                  <div className="min-w-0 max-w-[640px] flex-1 basis-0">
                    <ChessBoard
                      fen={viewFen}
                      orientation={orientation}
                      lastMove={lastMove}
                      bestArrowUci={arrowUci}
                      interactive={boardInteractive}
                      onMove={applyMove}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 sm:ml-7">
                  <span className="mr-auto text-sm font-semibold text-blue-100" aria-live="polite">
                    {statusLine}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-slate-200 hover:bg-white/10"
                    onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}
                  >
                    <FlipHorizontal2 className="h-3.5 w-3.5" /> Flip
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-slate-200 hover:bg-white/10"
                    onClick={undo}
                    disabled={!moves.length || panel === "watch"}
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-slate-200 hover:bg-white/10"
                    onClick={reset}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-slate-200 hover:bg-white/10"
                    onClick={copyFen}
                  >
                    <Copy className="h-3.5 w-3.5" /> FEN
                  </Button>
                </div>
              </div>

              <p className="px-1 text-xs leading-relaxed text-blue-200/40">
                <b className="text-blue-200/70">Live coach:</b> play moves and Stake Fish answers instantly with a
                best-move arrow. <b className="text-blue-200/70">Jessie:</b> a smart bot you can actually beat (or
                not). <b className="text-blue-200/70">Watch link:</b> paste a live chess.com / lichess game URL and
                the board mirrors it move-by-move with coaching.
              </p>
            </div>

            {/* side panel */}
            <Tabs value={panel} onValueChange={(v) => setPanel(v as Panel)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 border border-white/10 bg-white/[0.04]">
                <TabsTrigger
                  value="coach"
                  className="text-[11px] text-blue-100/50 data-[state=active]:bg-blue-500/25 data-[state=active]:text-blue-200 sm:text-xs"
                >
                  Live Coach
                </TabsTrigger>
                <TabsTrigger
                  value="jessie"
                  className="text-[11px] text-blue-100/50 data-[state=active]:bg-blue-500/25 data-[state=active]:text-blue-200 sm:text-xs"
                >
                  Play Jessie
                </TabsTrigger>
                <TabsTrigger
                  value="watch"
                  className="text-[11px] text-blue-100/50 data-[state=active]:bg-blue-500/25 data-[state=active]:text-blue-200 sm:text-xs"
                >
                  Watch Link
                </TabsTrigger>
              </TabsList>

              <TabsContent value="coach" className="mt-4">
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

              <TabsContent value="jessie" className="mt-4">
                <JessiePanel
                  level={jessieLevel}
                  onLevelChange={(l) => {
                    setJessieLevel(l);
                    toast({ title: `Jessie → ${l.label}`, description: l.blurb });
                  }}
                  userColor={userColor}
                  onUserColorChange={(c) => setJessieSide(c === "w" ? "b" : "w")}
                  thinking={jessieThinking}
                  speech={jessieSpeech}
                  onRestart={jessieRestart}
                  onResign={jessieResign}
                  playing={panel === "jessie" && !gameOver && !jessieResigned}
                />
              </TabsContent>

              <TabsContent value="watch" className="mt-4">
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
                  watching={watching}
                  watchError={watchError}
                  watchInfo={watchInfo}
                  onWatch={startWatch}
                  onStopWatch={stopWatch}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {siteTab === "docs" && (
          <div className="flex flex-col gap-6">
            <ApiDocsSection />
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <h2 className="text-xl font-extrabold tracking-tight text-white">Extension integration (v1.2)</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-blue-100/60">
                The extension injects a content script into <b className="text-blue-200">chess.com</b>,{" "}
                <b className="text-blue-200">lichess.org</b> and <b className="text-blue-200">chesskid.com</b>. It
                locates the board element, reads every piece from the DOM (positions via CSS transforms, colors
                and piece types from class names), rebuilds the FEN, then runs the same Stake Fish WASM build in
                a Web Worker and overlays an SVG arrow + eval pill. Settings (style, depth, arrows,
                auto-analyze) sync through <code className="rounded bg-white/10 px-1 text-blue-200">chrome.storage</code>.
              </p>
              <pre className="mt-4 overflow-x-auto rounded-lg border border-white/10 bg-[#060b16] p-3 text-[11px] leading-relaxed text-blue-200">
{`// sites supported (v1.2 — exactly 3):
chess.com   →  .board / wc-chess-board / #board-single
lichess.org →  cg-board (transform % per piece)
chesskid.com→  #board / .board (chess.com-style DOM)

// engine: chrome.runtime.getURL('stockfish-19-lite-single.js')
// drawn:  <svg viewBox="0 0 8 8"> arrow from→to + eval pill`}
              </pre>
            </section>
          </div>
        )}

        {siteTab === "blog" && <BlogSection />}

        {siteTab === "download" && <DownloadSection />}
      </main>

      {/* ---------------- footer ---------------- */}
      <footer className="relative z-10 mt-auto border-t border-white/10 bg-[#060b16]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-1 px-4 py-4 text-center text-xs text-blue-200/40">
          <p className="flex items-center gap-1.5 font-semibold text-blue-100">
            <Fish className="h-3.5 w-3.5 text-blue-400" /> Stake Fish 1.2 — web build of the Stake Fish UCI engine
          </p>
          <p>
            Stockfish 19 NNUE core (GPL-3.0) runs entirely in your browser · Engine:{" "}
            <a
              href="https://github.com/gefrus112/stake-fish-1.0"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-blue-300"
            >
              gefrus112/stake-fish-1.0
            </a>{" "}
            · Not affiliated with Chess.com, Lichess or ChessKid
          </p>
        </div>
      </footer>
    </div>
  );
}
