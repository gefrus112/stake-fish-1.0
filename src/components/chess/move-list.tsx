"use client";

import { CLASS_META, type Classification, type PlayedMove } from "@/lib/chess-utils";

interface MoveListProps {
  moves: PlayedMove[];
  classes: (Classification | null)[];
  viewPly: number;
  onSelectPly: (ply: number) => void;
}

export function MoveList({ moves, classes, viewPly, onSelectPly }: MoveListProps) {
  const rows: { no: number; white?: { mv: PlayedMove; idx: number }; black?: { mv: PlayedMove; idx: number } }[] = [];
  moves.forEach((mv, idx) => {
    if (mv.color === "w") {
      rows.push({ no: idx / 2 + 1, white: { mv, idx } });
    } else {
      const last = rows[rows.length - 1];
      if (last && !last.black) {
        last.black = { mv, idx };
      } else {
        rows.push({ no: Math.floor(idx / 2) + 1, black: { mv, idx } });
      }
    }
  });

  if (!moves.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-blue-200/40">
        No moves yet — import a game or play on the board.
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-2xl border border-white/10" role="list" aria-label="Move list">
      <div className="grid grid-cols-[2.4rem_1fr_1fr] gap-px bg-white/5 text-sm">
        <div className="sticky top-0 z-10 bg-[#0d1a30] px-2 py-1.5 text-[11px] font-bold text-blue-200/50">#</div>
        <div className="sticky top-0 z-10 bg-[#0d1a30] px-2 py-1.5 text-[11px] font-bold text-blue-200/50">White</div>
        <div className="sticky top-0 z-10 bg-[#0d1a30] px-2 py-1.5 text-[11px] font-bold text-blue-200/50">Black</div>
        {rows.map((row) => (
          <div key={row.no} className="col-span-3 grid grid-cols-[2.4rem_1fr_1fr] gap-px">
            <div className="bg-white/[0.02] px-2 py-1.5 text-xs tabular-nums text-blue-200/40">{row.no}.</div>
            {[row.white, row.black].map((cell, i) =>
              cell ? (
                <button
                  key={i}
                  type="button"
                  role="listitem"
                  onClick={() => onSelectPly(cell.idx + 1)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-left font-medium transition-colors ${
                    viewPly === cell.idx + 1
                      ? "bg-blue-500/20 text-blue-100"
                      : "bg-white/[0.03] hover:bg-white/10"
                  }`}
                >
                  {classes[cell.idx] && (
                    <span
                      className={`h-2 w-2 flex-none rounded-full ${CLASS_META[classes[cell.idx]!].dot}`}
                      title={CLASS_META[classes[cell.idx]!].label}
                    />
                  )}
                  <span className="truncate">{cell.mv.san}</span>
                </button>
              ) : (
                <div key={i} className="bg-white/[0.03]" />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
