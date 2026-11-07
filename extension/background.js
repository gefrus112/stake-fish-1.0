/* Stake Fish 1.0 — background service worker (Chrome/Edge/Opera GX, MV3) */

const DEFAULTS = {
  style: 'gm', // 'gm' = GM Coach commentary, 'bot' = plain bot moves
  depth: 12,
  showArrows: true,
  autoRun: true,
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(Object.keys(DEFAULTS), (existing) => {
    const missing = {};
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (existing[k] === undefined) missing[k] = v;
    }
    if (Object.keys(missing).length) chrome.storage.sync.set(missing);
  });
});
