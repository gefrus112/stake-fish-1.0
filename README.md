# 🐟 Stake Fish 1.2

**stake fish** is a chess engine. It analyzes chess positions, evaluates them, and tries to find the best move. It communicates with chess apps via the UCI protocol.

This repository contains the full **Stake Fish 1.2** product:

1. **Web analyzer** (Next.js) — a full chess coach that runs the engine in your browser
   - **Live Coach** — play on the board, get instant best-move arrows, eval bar, MultiPV lines
   - **Play Jessie** — a smart chess bot coach (UCI Skill Level 0–20) with a personality
   - **Watch Link** — paste a live game link (`chess.com/game/…`, `lichess.org/…`) and the board mirrors the game move-by-move while coaching the best next move
   - **Game review** — full-game engine review: accuracy %, move classifications (Best → Blunder), eval graph
   - **Docs / Blog / Download tabs**, liquid-blue theme with a canvas code-rain background

2. **Browser extension v1.2** (`extension/`) — Manifest V3 for Chrome, Edge and Opera GX
   - Supports exactly **3 sites**: **Chess.com, Lichess, ChessKid**
   - Connects to the live board via the DOM (no screenshots), draws best-move arrows + eval pill
   - Popup detects the current chess site; GM-Coach or Bot advisor styles; runs 100% locally

## Engine

- Web build: Stockfish 19 lite-single WASM (NNUE), with asm.js fallback
- Files served from `public/stockfish/` and bundled inside the extension
- UCI API — see the site's **Docs** tab for the full command list and worker bridge examples

## Run the website

```bash
bun install
bun run dev     # http://localhost:3000
```

## Install the extension

1. Download `stake-fish-extension.zip` from the site's **Download** tab (or use `extension/` directly)
2. Open `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select the folder
3. Open a game on Chess.com / Lichess / ChessKid

## API

| Endpoint | Description |
| --- | --- |
| `POST /api/import` | `{ url }` → fetches a game PGN from Lichess / Chess.com (or accepts raw PGN) |
| `POST /api/coach`  | `{ fen, bestMove, scoreText }` → GM-style commentary for a position |

## Fair play

Using engine assistance in rated games violates the rules of Chess.com, Lichess and ChessKid. Use Stake Fish for analysis, opening study, and reviewing your games.

Upstream engine: [official-stockfish/Stockfish](https://github.com/official-stockfish/Stockfish) (GPL-3.0)
