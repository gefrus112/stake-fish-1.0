"use client";

import { useEffect, useMemo, useState } from "react";
import { safeChess } from "@/lib/chess-utils";

const GLYPH: Record<string, string> = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
const FILES = "abcdefgh";

export interface BoardMove {
  from: string;
  to: string;
  promotion?: string;
}

interface ChessBoardProps {
  fen: string;
  orientation: "white" | "black";
  lastMove?: { from: string; to: string } | null;
  bestArrowUci?: string | null;
  interactive?: boolean;
  onMove?: (move: BoardMove) => void;
}

function sqToXY(sq: string, flipped: boolean): { x: number; y: number } {
  let col = sq.charCodeAt(0) - 97;
  let row = 8 - parseInt(sq[1], 10);
  if (flipped) {
    col = 7 - col;
    row = 7 - row;
  }
  return { x: col + 0.5, y: row + 0.5 };
}

export function ChessBoard({
  fen,
  orientation,
  lastMove,
  bestArrowUci,
  interactive = false,
  onMove,
}: ChessBoardProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [prevFen, setPrevFen] = useState(fen);

  const game = useMemo(() => safeChess(fen), [fen]);
  const flipped = orientation === "black";

  // Reset transient selection when the position changes (state adjustment during render).
  if (prevFen !== fen) {
    setPrevFen(fen);
    setSelected(null);
    setPendingPromotion(null);
  }

  const board = game.board();
  const turn = game.turn();

  const checkSquare = useMemo(() => {
    if (!game.isCheck()) return null;
    for (const row of board) {
      for (const sq of row) {
        if (sq && sq.type === "k" && sq.color === turn) return sq.square;
      }
    }
    return null;
  }, [board, game, turn]);

  const legalTargets = useMemo(() => {
    if (!selected) return new Map<string, boolean>();
    const moves = game.moves({ square: selected as never, verbose: true });
    const map = new Map<string, boolean>();
    for (const m of moves) map.set(m.to, m.captured !== undefined);
    return map;
  }, [selected, game]);

  function attemptMove(from: string, to: string): boolean {
    const moves = game.moves({ square: from as never, verbose: true }).filter((m) => m.to === to);
    if (!moves.length) return false;
    if (moves.some((m) => m.promotion)) {
      setPendingPromotion({ from, to });
      setSelected(null);
      return true;
    }
    onMove?.({ from, to });
    setSelected(null);
    return true;
  }

  function onSquareClick(square: string) {
    if (!interactive || pendingPromotion) return;
    if (selected) {
      if (square === selected) {
        setSelected(null);
        return;
      }
      if (legalTargets.has(square)) {
        attemptMove(selected, square);
        return;
      }
    }
    const piece = game.get(square as never);
    if (piece && piece.color === turn) {
      setSelected(square);
    } else {
      setSelected(null);
    }
  }

  // squares for promotion picker
  const promoSquares = useMemo(() => {
    if (!pendingPromotion) return [];
    const file = pendingPromotion.to[0];
    const topRank = pendingPromotion.to[1] === "8";
    return ["q", "r", "b", "n"].map((p, i) => ({
      piece: p,
      square: `${file}${topRank ? 8 - i : 1 + i}`,
      top: topRank,
    }));
  }, [pendingPromotion]);

  const moverIsWhite = turn === "w";

  return (
    <div className="relative w-full select-none [container-type:inline-size]">
      <div className="grid aspect-square w-full grid-cols-[repeat(8,minmax(0,1fr))] grid-rows-[repeat(8,minmax(0,1fr))] overflow-hidden rounded-xl border border-black/10 shadow-lg">
        {board.map((row, rowIdx) => {
          const rank = 8 - rowIdx;
          return row.map((piece, colIdx) => {
            const file = FILES[colIdx];
            const square = `${file}${rank}`;
            const displayCol = flipped ? 7 - colIdx : colIdx;
            const displayRow = flipped ? 7 - rowIdx : rowIdx;
            const isLight = (colIdx + rowIdx) % 2 === 0;
            const isSelected = selected === square;
            const isTarget = legalTargets.has(square);
            const isCapture = legalTargets.get(square);
            const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
            const isCheck = checkSquare === square;

            return (
              <button
                key={square}
                type="button"
                aria-label={`${file}${rank}${piece ? ` ${piece.color} ${piece.type}` : ""}`}
                onClick={() => onSquareClick(square)}
                onDragOver={(e) => {
                  if (interactive && selected && legalTargets.has(square)) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (selected && legalTargets.has(square)) attemptMove(selected, square);
                }}
                className="relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                style={{
                  gridColumn: displayCol + 1,
                  gridRow: displayRow + 1,
                  backgroundColor: isLight ? "#ebecd0" : "#739552",
                }}
              >
                {isLast && <span className="absolute inset-0 bg-amber-300/50" />}
                {isSelected && <span className="absolute inset-0 bg-amber-400/60" />}
                {isCheck && (
                  <span
                    className="absolute inset-0"
                    style={{ background: "radial-gradient(circle, rgba(239,68,68,0.75) 15%, rgba(239,68,68,0) 75%)" }}
                  />
                )}

                {colIdx === 0 && (
                  <span
                    className={`pointer-events-none absolute left-0.5 top-0.5 text-[9px] font-bold sm:text-[11px] ${
                      isLight ? "text-[#739552]" : "text-[#ebecd0]"
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {rowIdx === 7 && (
                  <span
                    className={`pointer-events-none absolute bottom-0 right-1 text-[9px] font-bold sm:text-[11px] ${
                      isLight ? "text-[#739552]" : "text-[#ebecd0]"
                    }`}
                  >
                    {file}
                  </span>
                )}

                {isTarget && !isCapture && (
                  <span className="pointer-events-none absolute h-[26%] w-[26%] rounded-full bg-black/25" />
                )}
                {isTarget && isCapture && (
                  <span className="pointer-events-none absolute inset-[8%] rounded-full border-4 border-black/25" />
                )}

                {piece && (
                  <span
                    draggable={interactive}
                    onDragStart={() => {
                      if (interactive) setSelected(square);
                    }}
                    className={`pointer-events-none relative z-10 leading-none ${
                      interactive ? "cursor-grab active:cursor-grabbing" : ""
                    } ${piece.color === "w" ? "text-white" : "text-neutral-900"}`}
                    style={{
                      fontSize: "clamp(1.1rem, 7.4cqw, 3.1rem)",
                      textShadow:
                        piece.color === "w"
                          ? "0 1px 3px rgba(0,0,0,.75), 0 0 1px rgba(0,0,0,.9)"
                          : "0 1px 2px rgba(255,255,255,.22)",
                    }}
                  >
                    {GLYPH[piece.type]}
                  </span>
                )}
              </button>
            );
          });
        })}
      </div>

      {/* best move arrow */}
      {bestArrowUci && bestArrowUci.length >= 4 && (
        <svg viewBox="0 0 8 8" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-20 h-full w-full">
          {(() => {
            const from = sqToXY(bestArrowUci.slice(0, 2), flipped);
            const to = sqToXY(bestArrowUci.slice(2, 4), flipped);
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const start = { x: from.x + ux * 0.3, y: from.y + uy * 0.3 };
            const end = { x: to.x - ux * 0.42, y: to.y - uy * 0.42 };
            const head = 0.36;
            const px = -uy;
            const py = ux;
            const p2 = `${end.x - ux * head + px * head * 0.5},${end.y - uy * head + py * head * 0.5}`;
            const p3 = `${end.x - ux * head - px * head * 0.5},${end.y - uy * head - py * head * 0.5}`;
            return (
              <g>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="#10b981"
                  strokeWidth={0.18}
                  strokeLinecap="round"
                  opacity={0.9}
                />
                <polygon points={`${end.x},${end.y} ${p2} ${p3}`} fill="#10b981" opacity={0.95} />
              </g>
            );
          })()}
        </svg>
      )}

      {/* promotion picker */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-30 bg-black/40" onClick={() => setPendingPromotion(null)}>
          <div
            className="absolute flex flex-col items-center gap-1 rounded-xl bg-white p-2 shadow-xl"
            style={{
              [promoSquares[0].top ? "top" : "bottom"]: "12%",
              left: `${(promoSquares[0].square.charCodeAt(0) - 97) * 12.5 + 2}%`,
            }}
          >
            {promoSquares.map((p) => (
              <button
                key={p.piece}
                type="button"
                aria-label={`Promote to ${p.piece}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMove?.({ from: pendingPromotion.from, to: pendingPromotion.to, promotion: p.piece });
                  setPendingPromotion(null);
                }}
                className={`flex h-11 w-11 items-center justify-center rounded-lg text-3xl leading-none hover:bg-emerald-100 ${
                  moverIsWhite ? "text-white" : "text-neutral-900"
                }`}
                style={{ textShadow: moverIsWhite ? "0 1px 3px rgba(0,0,0,.8)" : "none" }}
              >
                {GLYPH[p.piece]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
