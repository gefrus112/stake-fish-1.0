import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * POST /api/import — fetch a game by link (Lichess / Chess.com) or accept raw PGN.
 * Body: { url?: string, pgn?: string }
 * Returns: { ok: true, pgn, source } or { ok: false, error }
 */

const UA = "Mozilla/5.0 (compatible; StakeFishAnalyzer/1.0; +https://stake.fish)";

async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 9000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, headers: { "User-Agent": UA, ...(init.headers ?? {}) } });
  } finally {
    clearTimeout(t);
  }
}

function extractLichessId(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!url.hostname.endsWith("lichess.org")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const id = (parts[parts.length - 1] ?? "").replace(/[^A-Za-z0-9]/g, "");
    return /^[A-Za-z0-9]{5,12}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function extractChesscomId(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (!url.hostname.replace(/^www\./, "").endsWith("chess.com")) return null;
    const m = url.pathname.match(/(\d{4,})\/?$/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function fetchLichess(id: string): Promise<string> {
  const res = await fetchWithTimeout(`https://lichess.org/game/export/${id}`, {
    headers: { Accept: "application/x-chess-pgn" },
  });
  if (!res.ok) throw new Error(res.status === 404 ? "Game not found on Lichess (it may be private)." : `Lichess returned ${res.status}`);
  const pgn = await res.text();
  if (!pgn.trim()) throw new Error("Lichess returned an empty PGN.");
  return pgn;
}

async function fetchChesscom(id: string): Promise<string> {
  // undocumented-but-public endpoint used by many tools
  try {
    const res = await fetchWithTimeout(`https://www.chess.com/callback/live/game/${id}`);
    if (res.ok) {
      const json = (await res.json()) as { pgn?: string };
      if (json?.pgn && json.pgn.trim()) return json.pgn;
    }
  } catch {
    /* fall through */
  }
  throw new Error("Could not fetch this Chess.com game. Download the PGN from the game page and paste it below.");
}

export async function POST(req: NextRequest) {
  let body: { url?: string; pgn?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const rawPgn = typeof body.pgn === "string" ? body.pgn.trim() : "";
  if (rawPgn) {
    return NextResponse.json({ ok: true, pgn: rawPgn, source: "pasted PGN" });
  }

  const rawUrlInput = (body.url ?? "").trim();
  if (!rawUrlInput) {
    return NextResponse.json({ ok: false, error: "Provide a game link or paste a PGN." }, { status: 400 });
  }
  // Accept protocol-less input like "lichess.org/xxxx"
  const rawUrl = /^https?:\/\//i.test(rawUrlInput) ? rawUrlInput : `https://${rawUrlInput}`;

  const lichessId = extractLichessId(rawUrl);
  if (lichessId) {
    try {
      const pgn = await fetchLichess(lichessId);
      return NextResponse.json({ ok: true, pgn, source: "Lichess" });
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `${err instanceof Error ? err.message : "Fetch failed"} — or paste the PGN instead.` },
        { status: 502 }
      );
    }
  }

  const chesscomId = extractChesscomId(rawUrl);
  if (chesscomId) {
    try {
      const pgn = await fetchChesscom(chesscomId);
      return NextResponse.json({ ok: true, pgn, source: "Chess.com" });
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `${err instanceof Error ? err.message : "Fetch failed"}` },
        { status: 502 }
      );
    }
  }

  // Last resort: maybe the URL itself points at a PGN file.
  try {
    const res = await fetchWithTimeout(rawUrl, { headers: { Accept: "text/plain" } });
    if (res.ok) {
      const text = await res.text();
      if (text.includes("[Event ") || /\d\.\s?\w+/.test(text.slice(0, 4000))) {
        return NextResponse.json({ ok: true, pgn: text, source: "direct link" });
      }
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json(
    { ok: false, error: "Unsupported link. Use a Lichess game URL (lichess.org/xxxxxxxx) or a Chess.com game URL (chess.com/game/live/123456), or paste the PGN." },
    { status: 400 }
  );
}
