"use client";

import { useMemo } from "react";
import { scoreToCp, winPercent, type EngineLine } from "@/lib/chess-utils";

interface EvalGraphProps {
  evals: (EngineLine | null)[]; // per position (0..n)
  viewPly: number;
  onSelectPly: (ply: number) => void;
}

const W = 600;
const H = 110;
const PAD = 4;

export function EvalGraph({ evals, viewPly, onSelectPly }: EvalGraphProps) {
  const points = useMemo(() => {
    const pts: { x: number; y: number; ply: number; cp: number }[] = [];
    const n = Math.max(evals.length - 1, 1);
    evals.forEach((line, i) => {
      if (!line) return;
      const turn = i % 2 === 0 ? "w" : "b";
      const cp = scoreToCp(line.score);
      const cpWhite = turn === "w" ? cp : -cp;
      const y = H - PAD - (winPercent(cpWhite) / 100) * (H - PAD * 2);
      const x = PAD + (i / n) * (W - PAD * 2);
      pts.push({ x, y, ply: i, cp: cpWhite });
    });
    return pts;
  }, [evals]);

  if (points.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-4 text-center text-xs text-blue-200/40">
        Run the full game analysis to see the evaluation graph.
      </div>
    );
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`;
  const viewX = points[Math.min(viewPly, points.length - 1)]?.x ?? PAD;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#060b16]">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-24 w-full cursor-pointer"
        preserveAspectRatio="none"
        role="img"
        aria-label="Evaluation graph across the game"
      >
        <rect x={0} y={0} width={W} height={H} fill="#0a1424" />
        <path d={areaPath} fill="#dbe7f5" opacity={0.92} />
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        <line x1={viewX} y1={0} x2={viewX} y2={H} stroke="#3b82f6" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {points.map((p) => (
          <g key={p.ply}>
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" onClick={() => onSelectPly(p.ply)} />
            <circle
              cx={p.x}
              cy={p.y}
              r={viewPly === p.ply ? 4.5 : 2.5}
              fill={viewPly === p.ply ? "#10b981" : "#9ca3af"}
              stroke="#0a1424"
              strokeWidth={1}
              pointerEvents="none"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
