import { Chess } from "chess.js";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1";

/* ---------------- Engine score helpers ---------------- */

export type ScoreType = "cp" | "mate";

export interface EngineScore {
  type: ScoreType;
  value: number;
}

/** Convert a UCI score (side-to-move POV) into centipawns, with mate clamped to huge values. */
export function scoreToCp(score: EngineScore): number {
  if (score.type === "mate") {
    return score.value > 0 ? 100000 - score.value : -100000 - score.value;
  }
  return score.value;
}

/** Format a score for display (side-to-move POV). */
export function formatScore(score: EngineScore): string {
  if (score.type === "mate") {
    return `M${Math.abs(score.value)}`;
  }
  const v = score.value / 100;
  const sign = v > 0 ? "+" : v < 0 ? "-" : "";
  return `${sign}${Math.abs(v).toFixed(1)}`;
}

/** Negate a score (flip POV). */
export function negateScore(score: EngineScore): EngineScore {
  return { type: score.type, value: -score.value };
}

/** Win probability for the side the score belongs to (Lichess model). */
export function winPercent(cp: number): number {
  const clamped = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

/* ---------------- UCI -> SAN helpers ---------------- */

export function uciToSan(fen: string, uci: string): string | null {
  try {
    const g = new Chess(fen);
    const mv = g.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return mv.san;
  } catch {
    return null;
  }
}

export function pvToSan(fen: string, pv: string[], max = 10): string[] {
  const out: string[] = [];
  try {
    const g = new Chess(fen);
    for (const uci of pv.slice(0, max)) {
      try {
        const m = g.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci[4] : undefined,
        });
        out.push(m.san);
      } catch {
        break;
      }
    }
  } catch {
    return out;
  }
  return out;
}

/* ---------------- Move classification ---------------- */

export type Classification = "best" | "great" | "good" | "inaccuracy" | "mistake" | "blunder";

export const CLASS_META: Record<
  Classification,
  { label: string; dot: string; text: string; badge: string }
> = {
  best: {
    label: "Best",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  great: {
    label: "Great",
    dot: "bg-teal-500",
    text: "text-teal-600",
    badge: "bg-teal-100 text-teal-700 border-teal-200",
  },
  good: {
    label: "Good",
    dot: "bg-lime-500",
    text: "text-lime-700",
    badge: "bg-lime-100 text-lime-800 border-lime-200",
  },
  inaccuracy: {
    label: "Inaccuracy",
    dot: "bg-amber-500",
    text: "text-amber-600",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  mistake: {
    label: "Mistake",
    dot: "bg-orange-500",
    text: "text-orange-600",
    badge: "bg-orange-100 text-orange-700 border-orange-200",
  },
  blunder: {
    label: "Blunder",
    dot: "bg-red-500",
    text: "text-red-600",
    badge: "bg-red-100 text-red-700 border-red-200",
  },
};

/** delta = (centipawn loss from mover's POV); isBest = played the engine's top move */
export function classifyMove(deltaCp: number, isBest: boolean): Classification {
  if (isBest) return "best";
  if (deltaCp <= 25) return "great";
  if (deltaCp <= 90) return "good";
  if (deltaCp <= 200) return "inaccuracy";
  if (deltaCp <= 350) return "mistake";
  return "blunder";
}

/** Lichess-style per-move accuracy from win% before/after (mover POV). */
export function moveAccuracy(wpBefore: number, wpAfter: number): number {
  const drop = Math.max(0, wpBefore - wpAfter);
  const acc = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}

/* ---------------- PGN helpers ---------------- */

export interface PgnHeaders {
  White: string;
  Black: string;
  Result: string;
  Event: string;
  Date: string;
}

export function parsePgnHeaders(pgn: string): PgnHeaders {
  const pick = (tag: string): string => {
    const m = pgn.match(new RegExp(`\\[${tag}\\s+"([^"]*)"\\]`));
    return m?.[1] ?? "";
  };
  return {
    White: pick("White") || "White",
    Black: pick("Black") || "Black",
    Result: pick("Result") || "*",
    Event: pick("Event") || "Imported game",
    Date: pick("Date") || "",
  };
}

export function safeChess(fen?: string): Chess {
  try {
    return fen ? new Chess(fen) : new Chess();
  } catch {
    return new Chess();
  }
}

/* ---------------- Shared types ---------------- */

export interface PlayedMove {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  uci: string;
  fenAfter: string;
  color: "w" | "b";
}

export const EXAMPLE_PGN = `[Event "A Night at the Opera"]
[Site "Paris Opera House"]
[Date "1858.01.01"]
[White "Paul Morphy"]
[Black "Duke of Brunswick & Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7
8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7
14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;
