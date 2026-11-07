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
      <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
        No moves yet — import a game or play on the board.
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto rounded-xl border" role="list" aria-label="Move list">
      <div className="grid grid-cols-[2.4rem_1fr_1fr] gap-px bg-neutral-200 text-sm">
        <div className="sticky top-0 z-10 bg-neutral-100 px-2 py-1.5 text-[11px] font-bold text-neutral-500">#</div>
        <div className="sticky top-0 z-10 bg-neutral-100 px-2 py-1.5 text-[11px] font-bold text-neutral-500">White</div>
        <div className="sticky top-0 z-10 bg-neutral-100 px-2 py-1.5 text-[11px] font-bold text-neutral-500">Black</div>
        {rows.map((row) => (
          <div key={row.no} className="col-span-3 grid grid-cols-[2.4rem_1fr_1fr] gap-px">
            <div className="bg-neutral-50 px-2 py-1.5 text-xs tabular-nums text-neutral-500">{row.no}.</div>
            {[row.white, row.black].map((cell, i) =>
              cell ? (
                <button
                  key={i}
                  type="button"
                  role="listitem"
                  onClick={() => onSelectPly(cell.idx + 1)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-left font-medium transition-colors ${
                    viewPly === cell.idx + 1
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-white hover:bg-neutral-100"
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
                <div key={i} className="bg-white" />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
