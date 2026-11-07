import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const runtime = "nodejs";

/**
 * POST /api/coach — Stake Fish GM Coach.
 * Takes an engine verdict for a position (or a whole-game summary) and
 * returns short, witty grandmaster-style commentary.
 * Body: { mode: "position" | "summary", fen?, bestMove?, scoreText?, classification?, lastMove?, blunders? }
 */

const POSITION_SYSTEM = `You are the "Stake Fish GM Coach", an energetic grandmaster chess commentator in the playful style of popular YouTube chess streamers.
Rules:
- Comment on ONE position only.
- 1-3 short sentences, max 60 words. Family-friendly, no profanity.
- Mention the recommended move in SAN. Reference tactics/patterns (forks, pins, open files, king safety, activity) when relevant.
- Vary your catchphrases. No emojis, no markdown.`;

const SUMMARY_SYSTEM = `You are the "Stake Fish GM Coach", an energetic grandmaster chess commentator in the playful style of popular YouTube chess streamers.
Rules:
- Summarize ONE full game based on the engine review data given.
- 3-5 short sentences, max 90 words. Family-friendly.
- Call out the biggest mistakes by move number and say what should have been played instead. No emojis, no markdown.`;

const FALLBACKS = {
  position: (best: string) =>
    `Play ${best || "the engine move"} — improve your worst piece, keep your king safe, and make your opponent solve problems every move.`,
  summary: () =>
    "A fighting game! The engine spotted a few key moments — next time slow down in sharp positions, double-check every capture, and convert your good positions patiently.",
};

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const mode = body.mode === "summary" ? "summary" : "position";

  try {
    const zai = await ZAI.create();
    const user =
      mode === "summary"
        ? `Game review data:\nOpening: ${body.opening ?? "unknown"}\nResult: ${body.result ?? "*"}\nWhite accuracy: ${body.whiteAccuracy ?? "?"}%\nBlack accuracy: ${body.blackAccuracy ?? "?"}%\nBiggest mistakes: ${
            Array.isArray(body.blunders) ? body.blunders.join("; ") : "none provided"
          }`
        : `Position: ${body.fen ?? "unknown"}\nBest move: ${body.bestMove ?? "?"} (SAN)\nEngine eval: ${body.scoreText ?? "0.0"} (positive = the side to move is better)\nLast move played: ${
            body.lastMove ?? "none"
          }\nThat last move was: ${body.classification ?? "unranked"}.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: mode === "summary" ? SUMMARY_SYSTEM : POSITION_SYSTEM },
        { role: "user", content: user },
      ],
      thinking: { type: "disabled" },
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty response");

    return NextResponse.json({ ok: true, text });
  } catch (err) {
    const fallback =
      mode === "summary"
        ? FALLBACKS.summary()
        : FALLBACKS.position(typeof body.bestMove === "string" ? body.bestMove : "");
    return NextResponse.json({ ok: true, text: fallback, fallback: true, error: String(err) });
  }
}
