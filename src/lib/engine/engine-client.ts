"use client";

/**
 * FishStick Lite 5.3 — browser engine client.
 *
 * Wraps a Stockfish WASM web worker (single-threaded build, with asm.js
 * fallback) and speaks the UCI protocol. Analyzes positions entirely
 * client-side: nothing is sent to any server.
 */

export type EngineStatus = "idle" | "loading" | "ready" | "thinking" | "error";

export interface EngineLine {
  multipv: number;
  depth: number;
  score: { type: "cp" | "mate"; value: number };
  pv: string[];
}

export interface EngineInfo {
  depth: number;
  seldepth: number;
  nodes: number;
  nps: number;
  timeMs: number;
  lines: EngineLine[];
  bestmove: string | null;
}

export interface AnalyzeOptions {
  depth?: number;
  multipv?: number;
}

const WASM_URL = "/stockfish/stockfish-19-lite-single.js";
const ASM_URL = "/stockfish/stockfish-19-asm.js";
const INIT_TIMEOUT_MS = 25_000;

function emptyInfo(): EngineInfo {
  return { depth: 0, seldepth: 0, nodes: 0, nps: 0, timeMs: 0, lines: [], bestmove: null };
}

class FishStickEngine {
  private worker: Worker | null = null;
  private status: EngineStatus = "idle";
  private statusCbs = new Set<(s: EngineStatus, detail?: string) => void>();
  private infoCbs = new Set<(info: EngineInfo) => void>();

  private searchSeq = 0;
  private currentSearch = 0;
  private currentInfo: EngineInfo = emptyInfo();
  private pendingSearch: ((info: EngineInfo) => void) | null = null;

  private readyOk: (() => void) | null = null;
  private readyFail: ((err: Error) => void) | null = null;
  private initPromise: Promise<void> | null = null;

  private gotFirstMessage = false;
  private usedFallback = false;
  private initTimer: ReturnType<typeof setTimeout> | null = null;

  /* ---------- public API ---------- */

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = new Promise<void>((resolve, reject) => {
        this.readyOk = resolve;
        this.readyFail = reject;
        this.spawn(WASM_URL);
      });
    }
    return this.initPromise;
  }

  onStatus(cb: (s: EngineStatus, detail?: string) => void): () => void {
    this.statusCbs.add(cb);
    cb(this.status);
    return () => {
      this.statusCbs.delete(cb);
    };
  }

  onInfo(cb: (info: EngineInfo) => void): () => void {
    this.infoCbs.add(cb);
    return () => {
      this.infoCbs.delete(cb);
    };
  }

  getStatus(): EngineStatus {
    return this.status;
  }

  /** Analyze a FEN. Resolves when the search finishes ("bestmove"). */
  async analyze(fen: string, opts: AnalyzeOptions = {}): Promise<EngineInfo> {
    await this.init();
    if (this.status === "error") throw new Error("Engine is not available");

    // Cut off any in-flight search.
    if (this.status === "thinking") {
      this.send("stop");
    }

    this.searchSeq += 1;
    const id = this.searchSeq;
    this.currentSearch = id;
    this.currentInfo = emptyInfo();
    this.setStatus("thinking");

    this.send(`setoption name MultiPV value ${Math.max(1, Math.min(5, opts.multipv ?? 3))}`);
    this.send(`position fen ${fen}`);
    this.send(`go depth ${Math.max(6, Math.min(26, opts.depth ?? 12))}`);

    return new Promise<EngineInfo>((resolve) => {
      this.pendingSearch = resolve;
    });
  }

  stop(): void {
    if (this.status === "thinking") this.send("stop");
  }

  /* ---------- internals ---------- */

  private send(cmd: string): void {
    try {
      this.worker?.postMessage(cmd);
    } catch {
      /* worker gone */
    }
  }

  private setStatus(s: EngineStatus, detail?: string): void {
    this.status = s;
    this.statusCbs.forEach((cb) => cb(s, detail));
  }

  private emitInfo(): void {
    const snapshot: EngineInfo = { ...this.currentInfo, lines: [...this.currentInfo.lines] };
    this.infoCbs.forEach((cb) => cb(snapshot));
  }

  private spawn(url: string): void {
    this.setStatus("loading");
    this.gotFirstMessage = false;

    if (this.initTimer) clearTimeout(this.initTimer);
    this.initTimer = setTimeout(() => this.handleInitFailure("Engine timed out"), INIT_TIMEOUT_MS);

    try {
      this.worker = new Worker(url);
    } catch {
      this.handleInitFailure("Could not create engine worker");
      return;
    }

    this.worker.onmessage = (e: MessageEvent) => {
      const data = e.data;
      const line =
        typeof data === "string"
          ? data
          : data && typeof data === "object"
            ? String(data.line ?? data.data ?? "")
            : "";
      if (!line) return;

      if (!this.gotFirstMessage) {
        this.gotFirstMessage = true;
        // Some builds queue commands; some need a nudge after the first print.
        this.send("uci");
        return;
      }
      this.handleLine(line);
    };

    this.worker.onerror = () => {
      this.handleInitFailure("Engine script failed to load");
    };
  }

  private handleInitFailure(reason: string): void {
    if (!this.usedFallback) {
      this.usedFallback = true;
      try {
        this.worker?.terminate();
      } catch {
        /* noop */
      }
      this.worker = null;
      this.spawn(ASM_URL);
      return;
    }
    if (this.initTimer) clearTimeout(this.initTimer);
    this.setStatus("error", reason);
    this.readyFail?.(new Error(reason));
  }

  private handleLine(line: string): void {
    if (line.startsWith("uciok")) {
      this.send("setoption name UCI_AnalyseMode value true");
      this.send("isready");
      return;
    }
    if (line.startsWith("readyok")) {
      if (this.initTimer) clearTimeout(this.initTimer);
      this.setStatus("ready");
      this.readyOk?.();
      return;
    }
    if (line.startsWith("bestmove")) {
      const mv = line.split(/\s+/)[1] ?? null;
      this.currentInfo.bestmove = mv;
      const result = { ...this.currentInfo, lines: [...this.currentInfo.lines] };
      const resolve = this.pendingSearch;
      this.pendingSearch = null;
      if (this.status === "thinking") this.setStatus("ready");
      resolve?.(result);
      this.emitInfo();
      return;
    }
    if (line.startsWith("info")) {
      if (this.status !== "thinking") return;
      const parsed = this.parseInfo(line);
      if (!parsed) return;
      this.mergeInfo(parsed);
      this.emitInfo();
    }
  }

  private parseInfo(line: string): EngineLine | null {
    if (!/\bscore (cp|mate) (-?\d+)/.test(line)) return null;

    const depth = Number(line.match(/\bdepth (\d+)/)?.[1] ?? 0);
    const seldepth = Number(line.match(/\bseldepth (\d+)/)?.[1] ?? 0);
    const nodes = Number(line.match(/\bnodes (\d+)/)?.[1] ?? 0);
    const nps = Number(line.match(/\bnps (\d+)/)?.[1] ?? 0);
    const timeMs = Number(line.match(/\btime (\d+)/)?.[1] ?? 0);
    const multipv = Number(line.match(/\bmultipv (\d+)/)?.[1] ?? 1);
    const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
    const pvMatch = line.match(/\bpv (.+)$/);

    if (!scoreMatch) return null;

    const score = {
      type: scoreMatch[1] as "cp" | "mate",
      value: Number(scoreMatch[2]),
    };
    const pv = pvMatch ? pvMatch[1].trim().split(/\s+/) : [];

    this.currentInfo.depth = depth;
    this.currentInfo.seldepth = seldepth;
    this.currentInfo.nodes = nodes;
    this.currentInfo.nps = nps;
    this.currentInfo.timeMs = timeMs;

    return { multipv, depth, score, pv };
  }

  private mergeInfo(line: EngineLine): void {
    const idx = this.currentInfo.lines.findIndex((l) => l.multipv === line.multipv);
    if (idx >= 0) this.currentInfo.lines[idx] = line;
    else this.currentInfo.lines.push(line);
    this.currentInfo.lines.sort((a, b) => a.multipv - b.multipv);
  }
}

/* Module-level singleton that survives HMR. */
const globalForEngine = globalThis as unknown as { __fishStickEngine?: FishStickEngine };

export function getEngine(): FishStickEngine {
  if (!globalForEngine.__fishStickEngine) {
    globalForEngine.__fishStickEngine = new FishStickEngine();
  }
  return globalForEngine.__fishStickEngine;
}
