"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bot, Loader2, RotateCcw, Flag } from "lucide-react";

export interface JessieLevel {
  label: string;
  skill: number;
  depth: number;
  blurb: string;
}

export const JESSIE_LEVELS: JessieLevel[] = [
  { label: "Beginner", skill: 1, depth: 6, blurb: "Learning the ropes — makes friendly mistakes." },
  { label: "Casual", skill: 4, depth: 8, blurb: "Plays for fun, punishes obvious hangs." },
  { label: "Club", skill: 8, depth: 10, blurb: "Solid club player. Bring your best opening." },
  { label: "Expert", skill: 13, depth: 12, blurb: "Sharp tactics. Don't drift in the middlegame." },
  { label: "Master", skill: 17, depth: 14, blurb: "Cold, precise, merciless." },
  { label: "Maximum", skill: 20, depth: 16, blurb: "Full-strength Stake Fish. Good luck." },
];

const JESSIE_IDLE = [
  "Hey! I'm Jessie 🐟 Paste, analyze, or play — I've got your back.",
  "Ready when you are! Pick a level and make your move.",
  "They call me the smartest fish in the sea. Let's see your opening!",
];

const JESSIE_THINKING = [
  "Interesting move… let me think.",
  "Ooh, sneaky. Give me a second.",
  "Calculating… my circuits are warming up.",
  "Hmm. I see a plan forming…",
];

const JESSIE_AFTER_MOVE = [
  "Your move — make it count!",
  "Tick tock, the fish is waiting.",
  "That's my idea. What's yours?",
  "I smell tactics nearby…",
];

const JESSIE_WIN = [
  "GG! The fish takes it — rematch?",
  "Splash! That one's mine. Want a revenge game?",
];

const JESSIE_LOSE = [
  "You got me!! GG — you're improving fast!",
  "Okay okay, that was clean. Well played!",
];

const JESSIE_DRAW = ["A draw! The ocean stays calm… for now.", "Even finish — good fight!"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function jessieLine(event: "idle" | "thinking" | "moved" | "win" | "lose" | "draw"): string {
  switch (event) {
    case "idle":
      return pick(JESSIE_IDLE);
    case "thinking":
      return pick(JESSIE_THINKING);
    case "moved":
      return pick(JESSIE_AFTER_MOVE);
    case "win":
      return pick(JESSIE_WIN);
    case "lose":
      return pick(JESSIE_LOSE);
    case "draw":
      return pick(JESSIE_DRAW);
  }
}

interface JessiePanelProps {
  level: JessieLevel;
  onLevelChange: (l: JessieLevel) => void;
  userColor: "w" | "b";
  onUserColorChange: (c: "w" | "b") => void;
  thinking: boolean;
  speech: string;
  onRestart: () => void;
  onResign: () => void;
  playing: boolean;
}

export function JessiePanel(p: JessiePanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Jessie intro card */}
      <div className="overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-950/80 via-[#0a1830] to-[#060b16]">
        <div className="flex items-center gap-3 p-4">
          <Image
            src="/jessie-avatar.png"
            alt="Jessie — Stake Fish chess bot coach"
            width={72}
            height={72}
            className="h-[72px] w-[72px] rounded-2xl border border-blue-400/30 shadow-lg shadow-blue-500/20"
            priority
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-base font-extrabold text-white">
              Jessie
              <Badge className="border-0 bg-blue-500/20 text-blue-300">Bot Coach</Badge>
              {p.thinking && <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-300" />}
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-blue-200/60">
              {p.level.label} · skill {p.level.skill}/20 · depth {p.level.depth} — {p.level.blurb}
            </p>
          </div>
        </div>
        {/* speech bubble */}
        <div className="relative border-t border-white/5 bg-blue-500/5 px-4 py-3">
          <p className="min-h-10 text-sm leading-relaxed text-blue-100">{p.speech}</p>
          <span className="absolute -top-[7px] left-[26px] h-3 w-3 rotate-45 border-l border-t border-blue-400/20 bg-[#0a1830]" />
        </div>
      </div>

      {/* setup */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-blue-200/60">Jessie&apos;s level</Label>
          <Select
            value={p.level.label}
            onValueChange={(v) => p.onLevelChange(JESSIE_LEVELS.find((l) => l.label === v) ?? JESSIE_LEVELS[2])}
          >
            <SelectTrigger className="h-8 w-[150px] border-white/10 bg-white/5 text-xs text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0a1830] text-white">
              {JESSIE_LEVELS.map((l) => (
                <SelectItem key={l.label} value={l.label}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-blue-200/60">You play</Label>
          <Select value={p.userColor} onValueChange={(v) => p.onUserColorChange(v as "w" | "b")}>
            <SelectTrigger className="h-8 w-[150px] border-white/10 bg-white/5 text-xs text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-white/10 bg-[#0a1830] text-white">
              <SelectItem value="w">♔ White (first)</SelectItem>
              <SelectItem value="b">♚ Black (Jessie starts)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-1 flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-blue-500 text-white hover:bg-blue-400"
            onClick={p.onRestart}
          >
            <RotateCcw className="h-3.5 w-3.5" /> {p.playing ? "Restart game" : "Start game"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-white/15 text-slate-200 hover:bg-white/10"
            onClick={p.onResign}
            disabled={!p.playing}
          >
            <Flag className="h-3.5 w-3.5" /> Resign
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-blue-200/50">
        <span className="flex items-center gap-1.5 font-semibold text-blue-200/80">
          <Bot className="h-3.5 w-3.5" /> How Jessie works
        </span>
        Jessie is the Stake Fish engine wearing a friendly face — her level maps to UCI Skill Level +
        search depth. She runs entirely in your browser, just like the coach.
      </div>
    </div>
  );
}
