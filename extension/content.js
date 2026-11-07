/**
 * Stake Fish 1.0 — content script (Chess.com + Lichess)
 *
 * Watches the live board via DOM (no screenshots), rebuilds the FEN,
 * runs the Stake Fish engine (Stockfish WASM core) in a local Worker and
 * draws the best move as an arrow + eval pill directly on the page.
 * Everything runs locally in the browser — no data leaves the machine.
 */

(() => {
  if (window.__stakeFishLoaded) return;
  window.__stakeFishLoaded = true;

  const FILES = 'abcdefgh';
  const DEBUG = '[StakeFish]';

  /* ------------------------- settings ------------------------- */

  let settings = { style: 'gm', depth: 12, showArrows: true, autoRun: true };

  function loadSettings() {
    try {
      chrome.storage.sync.get(Object.keys(settings), (s) => {
        settings = { ...settings, ...s };
        applySettingsChange();
      });
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        let touched = false;
        for (const [k, { newValue }] of Object.entries(changes)) {
          if (k in settings && settings[k] !== newValue) {
            settings[k] = newValue;
            touched = true;
          }
        }
        if (touched) applySettingsChange();
      });
    } catch (e) {
      console.warn(DEBUG, 'storage unavailable', e);
    }
  }

  function applySettingsChange() {
    if (!settings.autoRun) {
      stopEngine();
      renderPill(null);
      drawArrow(null);
    } else {
      scheduleRefresh(120);
    }
  }

  /* ------------------------- GM coach lines ------------------------- */

  const GM_LINES = {
    winningBig: [
      'This is completely winning — just do not hand it back!',
      'Look at this position. Absolute domination.',
      'The fish is smiling. Convert it calmly.',
    ],
    winning: [
      'Better for you — keep the squeeze on!',
      'Nice, you are calling the shots here.',
      'Small edge, big chances. Play on!',
    ],
    equal: [
      'Dead equal — fight for every tempo.',
      'Nothing separates the armies. Improve your worst piece.',
      'Balanced. Prophylaxis time.',
    ],
    worse: [
      'A bit worse — solid moves only!',
      'Slightly unpleasant. Trade the right pieces.',
      'Hold tight, counterplay is coming.',
    ],
    losing: [
      'This is rough — stay solid, set traps.',
      'You are worse here, but every move matters.',
      'No hope chess. Play the position.',
    ],
  };

  function gmPhrase(cpStm) {
    let pool;
    if (cpStm >= 600) pool = GM_LINES.winningBig;
    else if (cpStm >= 120) pool = GM_LINES.winning;
    else if (cpStm > -120) pool = GM_LINES.equal;
    else if (cpStm > -600) pool = GM_LINES.worse;
    else pool = GM_LINES.losing;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ------------------------- engine ------------------------- */

  let engine = null;
  let engineReady = false;
  let pendingFen = null;
  let analyzingFen = null;
  let currentFen = null;
  let lastResult = null; // { fen, bestUci, bestSan, score, depth, site }

  function ensureEngine() {
    if (engine) return;
    try {
      engine = new Worker(chrome.runtime.getURL('stockfish-19-lite-single.js'));
      engine.onmessage = (e) => {
        const data = e.data;
        const line = typeof data === 'string' ? data : data && typeof data === 'object' ? String(data.line || '') : '';
        if (!line) return;
        onEngineLine(line);
      };
      engine.onerror = () => {
        console.warn(DEBUG, 'engine worker error');
        engineReady = false;
      };
      engine.postMessage('uci');
    } catch (e) {
      console.warn(DEBUG, 'could not start engine', e);
    }
  }

  function stopEngine() {
    if (engine && analyzingFen) {
      try { engine.postMessage('stop'); } catch (_) {}
      analyzingFen = null;
    }
  }

  function analyzeFen(fen) {
    if (!settings.autoRun) return;
    if (!engineReady) {
      pendingFen = fen;
      ensureEngine();
      return;
    }
    stopEngine();
    analyzingFen = fen;
    renderPill({ state: 'thinking' });
    engine.postMessage('setoption name MultiPV value 1');
    engine.postMessage('position fen ' + fen);
    engine.postMessage('go depth ' + settings.depth);
  }

  function onEngineLine(line) {
    if (line === 'uciok') {
      engine.postMessage('setoption name MultiPV value 1');
      engine.postMessage('isready');
      return;
    }
    if (line === 'readyok') {
      engineReady = true;
      if (pendingFen) {
        const f = pendingFen;
        pendingFen = null;
        analyzeFen(f);
      }
      return;
    }
    if (line.startsWith('bestmove')) {
      const mv = line.split(/\s+/)[1];
      analyzingFen = null;
      if (mv && mv !== '(none)' && currentFen) {
        const san = toSan(currentFen, mv);
        lastResult = { ...(lastResult || {}), fen: currentFen, bestUci: mv, bestSan: san };
        publishResult();
      }
      return;
    }
    if (line.startsWith('info') && line.includes('score')) {
      const m = line.match(/\bdepth (\d+)/);
      const s = line.match(/\bscore (cp|mate) (-?\d+)/);
      if (s && currentFen) {
        const score = s[1] === 'mate' ? (s[2] > 0 ? 10000 : -10000) : parseInt(s[2], 10);
        lastResult = {
          ...(lastResult || {}),
          fen: currentFen,
          score,
          scoreText: s[1] === 'mate' ? 'M' + Math.abs(s[2]) : (score / 100).toFixed(1),
          depth: m ? parseInt(m[1], 10) : settings.depth,
          pvShown: true,
        };
        renderPill({ state: 'thinking', score, scoreText: lastResult.scoreText, depth: lastResult.depth });
      }
    }
  }

  function publishResult() {
    renderPill({
      state: 'done',
      score: lastResult.score ?? 0,
      scoreText: lastResult.scoreText ?? '0.0',
      bestSan: lastResult.bestSan,
      bestUci: lastResult.bestUci,
    });
    if (settings.showArrows && lastResult.bestUci) {
      drawArrow(lastResult.bestUci);
    }
    try {
      chrome.storage.local.set({
        lastAnalysis: {
          site: detectSite(),
          fen: lastResult.fen,
          bestUci: lastResult.bestUci,
          bestSan: lastResult.bestSan,
          score: lastResult.score ?? 0,
          scoreText: lastResult.scoreText ?? '0.0',
          depth: lastResult.depth ?? settings.depth,
          style: settings.style,
          at: Date.now(),
        },
      });
    } catch (_) {}
  }

  /* ------------------------- site + board detection ------------------------- */

  function detectSite() {
    const h = location.hostname;
    if (h.endsWith('lichess.org')) return 'lichess';
    if (h.endsWith('chesskid.com')) return 'chesskid';
    if (h.endsWith('chess.com')) return 'chesscom';
    return null;
  }

  function findBoard(site) {
    if (site === 'lichess') {
      const cb = document.querySelector('cg-board');
      if (cb) return cb.parentElement || cb.closest('.cg-wrap');
      return document.querySelector('.cg-wrap');
    }
    const candidates = ['#board-single', 'wc-chess-board', 'chess-board', '.chess-board-component .board', '#board', '.board-bg .board', '.board'];
    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el && (el.querySelector('.piece') || (el.shadowRoot && el.shadowRoot.querySelector('.piece')))) return el;
    }
    return null;
  }

  /* ------------------------- FEN extraction ------------------------- */

  function extractLichessPieces(root) {
    const pieces = [];
    root.querySelectorAll('piece').forEach((p) => {
      const cls = p.classList;
      let color = null;
      if (cls.contains('white')) color = 'w';
      else if (cls.contains('black')) color = 'b';
      if (!color) return;
      let type = null;
      if (cls.contains('king')) type = 'k';
      else if (cls.contains('queen')) type = 'q';
      else if (cls.contains('rook')) type = 'r';
      else if (cls.contains('bishop')) type = 'b';
      else if (cls.contains('knight')) type = 'n';
      else if (cls.contains('pawn')) type = 'p';
      if (!type) return;
      const tr = p.style.transform || '';
      const m = tr.match(/translate\((-?[\d.]+)(%|px)?,\s*(-?[\d.]+)(%|px)?\)/);
      if (!m) return;
      let col, row;
      if (m[2] === '%') {
        col = Math.round(parseFloat(m[1]) / 100);
        row = Math.round(parseFloat(m[3]) / 100);
      } else {
        const w = root.getBoundingClientRect().width / 8;
        if (w <= 0) return;
        col = Math.floor(parseFloat(m[1]) / w);
        row = Math.floor(parseFloat(m[3]) / w);
      }
      if (col < 0 || col > 7 || row < 0 || row > 7) return;
      pieces.push({ color, type, col, row }); // row 0 = rank 8
    });
    return pieces;
  }

  function extractChesscomPieces(el) {
    const root = el.shadowRoot || el;
    const flipped = el.classList.contains('flipped') || root.classList.contains('flipped');
    const rect = el.getBoundingClientRect();
    const sq = rect.width / 8;
    const pieces = [];
    root.querySelectorAll('.piece').forEach((p) => {
      const m = (p.className || '').match(/\b([wb])([pnbrqk])\b/);
      if (!m) return;
      let col = null;
      let row = null;
      const tr = p.style ? p.style.transform || '' : '';
      const tm = tr.match(/translate\((-?[\d.]+)(px|%|vh)?,\s*(-?[\d.]+)(px|%|vh)?\)/);
      const sm = (p.className || '').match(/square-(\d)(\d)/);
      if (tm && sq > 0 && tm[2] !== '%') {
        col = Math.round(parseFloat(tm[1]) / sq);
        row = Math.round(parseFloat(tm[3]) / sq);
      } else if (tm && tm[2] === '%') {
        col = Math.round(parseFloat(tm[1]) / 100);
        row = Math.round(parseFloat(tm[3]) / 100);
      } else if (sm) {
        col = parseInt(sm[1], 10);
        row = parseInt(sm[2], 10);
      }
      if (col == null || row == null || col < 0 || col > 7 || row < 0 || row > 7) return;
      if (flipped) { col = 7 - col; row = 7 - row; }
      pieces.push({ color: m[1], type: m[2], col, row }); // row 0 = rank 8
    });
    return pieces;
  }

  function countPlies(site) {
    try {
      if (site === 'chesscom' || site === 'chesskid') {
        let max = 0;
        document.querySelectorAll('[data-ply]').forEach((n) => {
          const v = parseInt(n.getAttribute('data-ply'), 10);
          if (!isNaN(v) && v > max) max = v;
        });
        if (max > 0) return max;
        return document.querySelectorAll('.move, .moves li, [class*=move-]').length;
      }
      const moves = document.querySelectorAll('.moves move, main moves move, move');
      return moves.length;
    } catch (_) {
      return 0;
    }
  }

  function buildFen(pieces, turn, plies) {
    const grid = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (const p of pieces) grid[p.row][p.col] = p;
    let board = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      let rowStr = '';
      for (let c = 0; c < 8; c++) {
        const p = grid[r][c];
        if (!p) { empty++; continue; }
        if (empty) { rowStr += empty; empty = 0; }
        rowStr += p.color === 'w' ? p.type.toUpperCase() : p.type;
      }
      if (empty) rowStr += empty;
      board += rowStr;
      if (r < 7) board += '/';
    }
    if (!/[a-zA-Z]/.test(board)) return null;

    const at = (r, c) => grid[r][c];
    let castling = '';
    if (at(7, 4) && at(7, 4).type === 'k' && at(7, 4).color === 'w') {
      if (at(7, 7) && at(7, 7).type === 'r' && at(7, 7).color === 'w') castling += 'K';
      if (at(7, 0) && at(7, 0).type === 'r' && at(7, 0).color === 'w') castling += 'Q';
    }
    if (at(0, 4) && at(0, 4).type === 'k' && at(0, 4).color === 'b') {
      if (at(0, 7) && at(0, 7).type === 'r' && at(0, 7).color === 'b') castling += 'k';
      if (at(0, 0) && at(0, 0).type === 'r' && at(0, 0).color === 'b') castling += 'q';
    }
    if (!castling) castling = '-';
    const fullmove = Math.floor(plies / 2) + 1;
    return `${board} ${turn} ${castling} - 0 ${fullmove}`;
  }

  /* ------------------------- SAN approximation ------------------------- */

  const LETTER = { p: '', n: 'N', b: 'B', r: 'R', q: 'Q', k: 'K' };

  function toSan(fen, uci) {
    try {
      const placement = fen.split(' ')[0];
      const rows = placement.split('/');
      const at = (sq) => {
        const c = sq.charCodeAt(0) - 97;
        const r = 8 - parseInt(sq[1], 10);
        const ch = (rows[r] || '')[c];
        return ch && ch !== '.' ? ch : null;
      };
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promo = uci.length > 4 ? uci[4] : null;
      const pf = at(from);
      if (!pf) return uci;
      const pt = pf === pf.toUpperCase() ? pf.toLowerCase() : pf;
      const isWhite = pf === pf.toUpperCase();

      if (pt === 'k' && Math.abs(from.charCodeAt(0) - to.charCodeAt(0)) === 2) {
        return from.charCodeAt(0) < to.charCodeAt(0) ? 'O-O' : 'O-O-O';
      }

      const target = at(to);
      const isCapture = !!target || (pt === 'p' && from[0] !== to[0]);

      if (pt === 'p') {
        let san = '';
        if (isCapture) san += from[0] + 'x';
        san += to;
        if (promo) san += '=' + promo.toUpperCase();
        return san;
      }

      // disambiguation among same type+color pieces
      const others = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const ch = (rows[r] || '')[c];
          if (!ch || ch === '.' || ch === undefined) continue;
          const t = ch.toLowerCase();
          if (t !== pt) continue;
          if (ch === ch.toUpperCase() !== isWhite) continue;
          const sq = FILES[c] + (8 - r);
          if (sq !== from) others.push(sq);
        }
      }
      let disamb = '';
      if (others.length) {
        const sameFile = others.some((o) => o[0] === from[0]);
        const sameRank = others.some((o) => o[1] === from[1]);
        if (!sameFile) disamb = from[0];
        else if (!sameRank) disamb = from[1];
        else disamb = from;
      }

      let san = LETTER[pt] + disamb;
      if (isCapture) san += 'x';
      san += to;
      return san;
    } catch (_) {
      return uci;
    }
  }

  /* ------------------------- overlay ------------------------- */

  function ensureOverlayHost(boardEl) {
    if (getComputedStyle(boardEl).position === 'static') boardEl.style.position = 'relative';
    let host = document.getElementById('stake-fish-overlay');
    if (!host || !boardEl.contains(host)) {
      if (host) host.remove();
      host = document.createElement('div');
      host.id = 'stake-fish-overlay';
      host.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:49;';
      boardEl.appendChild(host);
    }
    return host;
  }

  function sqToXY(sq, flipped) {
    let col = sq.charCodeAt(0) - 97;
    let row = 8 - parseInt(sq[1], 10);
    if (flipped) { col = 7 - col; row = 7 - row; }
    return { x: col + 0.5, y: row + 0.5 };
  }

  function drawArrow(uci) {
    const site = detectSite();
    const boardEl = boardCache;
    if (!boardEl) return;
    const host = ensureOverlayHost(boardEl);
    if (!uci) { host.innerHTML = ''; return; }
    const flipped = detectFlip(boardEl, site);
    const from = sqToXY(uci.slice(0, 2), flipped);
    const to = sqToXY(uci.slice(2, 4), flipped);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len, uy = dy / len;
    const start = { x: from.x + ux * 0.28, y: from.y + uy * 0.28 };
    const end = { x: to.x - ux * 0.38, y: to.y - uy * 0.38 };
    const headW = 0.34;
    const px = -uy, py = ux;
    const p1 = `${end.x},${end.y}`;
    const p2 = `${end.x - ux * headW + px * headW * 0.5},${end.y - uy * headW + py * headW * 0.5}`;
    const p3 = `${end.x - ux * headW - px * headW * 0.5},${end.y - uy * headW - py * headW * 0.5}`;
    host.innerHTML =
      '<svg viewBox="0 0 8 8" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;">' +
      `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="#10b981" stroke-width="0.19" stroke-linecap="round" opacity="0.88"/>` +
      `<polygon points="${p1} ${p2} ${p3}" fill="#10b981" opacity="0.92"/>` +
      '</svg>';
  }

  function renderPill(info) {
    const boardEl = boardCache;
    if (!boardEl) return;
    let pill = document.getElementById('stake-fish-pill');
    if (!info || !settings.autoRun) {
      if (pill) pill.remove();
      return;
    }
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'stake-fish-pill';
      pill.style.cssText =
        'position:absolute;top:8px;left:8px;z-index:50;pointer-events:none;display:flex;align-items:center;gap:6px;' +
        'padding:5px 10px;border-radius:999px;font:600 12px/1.2 -apple-system,Segoe UI,Roboto,sans-serif;' +
        'box-shadow:0 2px 10px rgba(0,0,0,.35);max-width:calc(100% - 16px);white-space:nowrap;overflow:hidden;';
      boardEl.appendChild(pill);
    }

    const stmWhite = (currentFen || '').split(' ')[1] !== 'b';
    const scoreForWhite = stmWhite ? (info.score ?? 0) : -(info.score ?? 0);
    const whiteBetter = scoreForWhite >= 0;
    pill.style.background = whiteBetter ? 'rgba(250,250,245,0.96)' : 'rgba(28,28,26,0.94)';
    pill.style.color = whiteBetter ? '#1c1c1a' : '#fafaf5';
    pill.style.border = '1px solid ' + (whiteBetter ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.15)');

    if (info.state === 'thinking') {
      pill.innerHTML =
        '<span style="width:10px;height:10px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;display:inline-block;animation:sfspin 0.8s linear infinite;"></span>' +
        `<span>Stake Fish · ${info.scoreText ?? '…'} · d${info.depth ?? settings.depth}</span>`;
    } else {
      const moveTxt = info.bestSan ? info.bestSan : (info.bestUci || '');
      if (settings.style === 'gm') {
        pill.innerHTML =
          '<span style="font-weight:800;">🐟</span>' +
          `<span>${moveTxt} — ${gmPhrase(scoreForWhite)}</span>`;
      } else {
        pill.innerHTML =
          '<span style="font-weight:800;">🐟</span>' +
          `<span>Best: <b>${moveTxt}</b> · ${info.scoreText ?? ''} · Stake Fish 1.0</span>`;
      }
    }
    if (!document.getElementById('stake-fish-style')) {
      const st = document.createElement('style');
      st.id = 'stake-fish-style';
      st.textContent = '@keyframes sfspin{to{transform:rotate(360deg)}}';
      document.documentElement.appendChild(st);
    }
  }

  /* ------------------------- orientation / refresh loop ------------------------- */

  let boardCache = null;
  let currentSite = null;
  let debounceTimer = null;
  let scanTimer = null;

  function detectFlip(boardEl, site) {
    if (site === 'lichess') {
      // orientation can be read from coords ranks: .rank elements order — fallback: parse board files
      const files = boardEl.parentElement ? boardEl.parentElement.querySelectorAll('.file') : [];
      if (files.length >= 2) return files[0].textContent.trim() !== 'a';
      const ranks = document.querySelectorAll('.rank');
      if (ranks.length >= 2) return ranks[0].textContent.trim() !== '8';
      return false;
    }
    const root = boardEl.shadowRoot || boardEl;
    if (boardEl.classList.contains('flipped') || root.classList.contains('flipped')) return true;
    const coords = root.querySelector('.coordinates, .coords');
    if (coords) {
      const first = coords.querySelector('*');
      if (first && first.textContent.trim() === '1') return true;
    }
    return false;
  }

  function refresh() {
    const site = detectSite();
    if (!site) return;
    const boardEl = findBoard(site);
    if (!boardEl) {
      boardCache = null;
      renderPill(null);
      return;
    }
    if (boardEl !== boardCache) {
      boardCache = boardEl;
      currentSite = site;
      attachObserver(boardEl);
      publishSiteStatus(site);
    }
    if (!settings.autoRun) return;

    let pieces = [];
    try {
      pieces = site === 'lichess' ? extractLichessPieces(boardEl) : extractChesscomPieces(boardEl);
      if (pieces.length < 2 && site === 'chesskid') pieces = extractChesscomPieces(boardEl.shadowRoot ? boardEl.shadowRoot.querySelector('.board, [class*=board]') || boardEl : boardEl);
    } catch (e) {
      console.warn(DEBUG, 'extract failed', e);
      return;
    }
    if (pieces.length < 2) return;
    const plies = countPlies(site);
    const turn = plies % 2 === 1 ? 'b' : 'w';
    const fen = buildFen(pieces, turn, plies);
    if (!fen || fen === currentFen) return;
    currentFen = fen;
    drawArrow(null);
    analyzeFen(fen);
  }

  function scheduleRefresh(delay = 350) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refresh, delay);
  }

  let observer = null;
  function attachObserver(boardEl) {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => scheduleRefresh());
    observer.observe(boardEl, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class', 'transform'] });
  }

  function publishSiteStatus(site) {
    try {
      chrome.storage.local.set({ siteStatus: { site, at: Date.now() } });
    } catch (_) {}
  }

  /* SPA navigation safety net */
  function startScan() {
    refresh();
    clearInterval(scanTimer);
    scanTimer = setInterval(() => {
      if (!boardCache || !document.contains(boardCache)) {
        boardCache = null;
        currentFen = null;
        renderPill(null);
      }
      refresh();
    }, 2500);
  }

  loadSettings();
  startScan();
  console.info(DEBUG, 'Stake Fish 1.2 active on', location.hostname);
})();
