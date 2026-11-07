/* Stake Fish 1.0 — popup logic */

const $ = (id) => document.getElementById(id);
const SITES = {
  lichess: { name: 'Lichess', hint: 'Watching your Lichess game — best move appears right on the board.' },
  chesscom: { name: 'Chess.com', hint: 'Watching your Chess.com game — best move appears right on the board.' },
  chesskid: { name: 'ChessKid', hint: 'Watching your ChessKid game — best move appears right on the board.' },
};

function renderSite(site, at) {
  if (site && SITES[site] && Date.now() - (at || 0) < 10 * 60 * 1000) {
    $('dot').classList.add('on');
    $('siteName').textContent = SITES[site].name + ' — live analysis on';
    $('siteHint').textContent = SITES[site].hint;
  } else {
    $('dot').classList.remove('on');
    $('siteName').textContent = 'No chess site detected';
    $('siteHint').textContent = 'Open a game on Chess.com or Lichess — Stake Fish reads the board live, no screenshots needed.';
  }
}

function renderBest(a) {
  if (!a || !a.bestUci || Date.now() - (a.at || 0) > 10 * 60 * 1000) {
    $('best').style.display = 'none';
    $('coach').style.display = 'none';
    return;
  }
  $('best').style.display = 'flex';
  $('bestSan').textContent = a.bestSan || a.bestUci;
  $('bestEval').textContent = a.scoreText || '';
  $('bestEval').style.color = a.score >= 0 ? '#059669' : '#dc2626';
  $('bestDepth').textContent = 'depth ' + (a.depth || '?');

  const stmWhite = (a.fen || '').split(' ')[1] !== 'b';
  const scoreWhite = stmWhite ? a.score : -a.score;
  if (a.style === 'gm') {
    const lines = {
      big: 'This is completely winning — do not hand it back!',
      good: 'Better for you — keep the squeeze on!',
      equal: 'Dead equal — fight for every tempo.',
      bad: 'A bit worse — solid moves only!',
      rough: 'This is rough — stay solid and set traps.',
    };
    const key = scoreWhite >= 600 ? 'big' : scoreWhite >= 120 ? 'good' : scoreWhite > -120 ? 'equal' : scoreWhite > -600 ? 'bad' : 'rough';
    $('coach').textContent = '♟ ' + (a.bestSan || '') + ' — ' + lines[key];
    $('coach').style.display = 'block';
  } else {
    $('coach').style.display = 'none';
  }
}

function load() {
  chrome.storage.local.get(['siteStatus', 'lastAnalysis'], (d) => {
    renderSite(d.siteStatus && d.siteStatus.site, d.siteStatus && d.siteStatus.at);
    renderBest(d.lastAnalysis);
  });
  chrome.storage.sync.get(['style', 'depth', 'showArrows', 'autoRun'], (s) => {
    $('style').value = s.style || 'gm';
    $('depth').value = s.depth || 12;
    $('depthVal').textContent = s.depth || 12;
    $('showArrows').checked = s.showArrows !== false;
    $('autoRun').checked = s.autoRun !== false;
  });
}

$('style').addEventListener('change', () => chrome.storage.sync.set({ style: $('style').value }));
$('depth').addEventListener('input', () => {
  $('depthVal').textContent = $('depth').value;
  chrome.storage.sync.set({ depth: parseInt($('depth').value, 10) });
});
$('showArrows').addEventListener('change', () => chrome.storage.sync.set({ showArrows: $('showArrows').checked }));
$('autoRun').addEventListener('change', () => chrome.storage.sync.set({ autoRun: $('autoRun').checked }));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') load();
});

load();
