"use client";

import { winPercent } from "@/lib/chess-utils";

interface EvalBarProps {
  cpWhite: number; // centipawns from White's POV (mate clamped big)
  label: string; // display text, e.g. "+1.2" or "M4"
  thinking?: boolean;
}

export function EvalBar({ cpWhite, label, thinking }: EvalBarProps) {
  const whiteShare = Math.max(2, Math.min(98, winPercent(cpWhite)));
  return (
    <div className="flex flex-col items-center gap-1.5 self-stretch" aria-label={`Evaluation ${label}, White advantage`}>
      <div className="relative w-3.5 flex-1 overflow-hidden rounded-full bg-neutral-900 shadow-inner sm:w-4">
        <div
          className="absolute bottom-0 left-0 right-0 bg-[#f4f4ee] transition-[height] duration-500 ease-out"
          style={{ height: `${whiteShare}%` }}
        />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-black/20" />
      </div>
      <span
        className={`w-11 rounded-md px-0.5 py-0.5 text-center text-[10px] font-bold tabular-nums sm:text-xs ${
          cpWhite >= 0 ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900 border border-neutral-300"
        } ${thinking ? "animate-pulse" : ""}`}
      >
        {label}
      </span>
    </div>
  );
}
