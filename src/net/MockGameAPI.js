// ============================================================
// MockGameAPI — fake backend for demo mode
// $POP removed — totalPop tracking gone.
// Flip VITE_USE_MOCK_API=false when real backend is live.
// ============================================================

const LS_STATS = 'pb_mock_stats';
const LS_RESPAWNS = 'pb_mock_respawns';
const LS_PLAYS = 'pb_mock_plays';
const LS_HOLDER = 'pb_mock_holder';

const todayUtc = () => new Date().toISOString().slice(0, 10);

function loadStats() {
  try { return JSON.parse(localStorage.getItem(LS_STATS) || '{}'); }
  catch { return {}; }
}
function saveStats(s) { localStorage.setItem(LS_STATS, JSON.stringify(s)); }

function loadDayCounter(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '{}');
    if (raw.date !== todayUtc()) return { date: todayUtc(), count: 0 };
    return raw;
  } catch { return { date: todayUtc(), count: 0 }; }
}
function saveDayCounter(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

function isHolder() { return localStorage.getItem(LS_HOLDER) === '1'; }

function makeSeed() { return (Math.random() * 0xffffffff) >>> 0; }

let _session = null;
function saveSession(s) {
  _session = s;
  if (s) sessionStorage.setItem('pb_mock_session', JSON.stringify(s));
  else sessionStorage.removeItem('pb_mock_session');
}
function loadSession() {
  if (_session) return _session;
  try {
    const raw = sessionStorage.getItem('pb_mock_session');
    if (raw) _session = JSON.parse(raw);
  } catch {}
  return _session;
}

const MOCK_CONFIG = {
  holderUsdThreshold: 10,
  playFeeSol: 0.002,
  reviveFeeSol: 0.002,
  reviveFeeBird: 1000,
  nonHolderFreePlaysPerDay: 3,
  holderFreeRespawnsPerDay: 3,
  maxRespawnsPerGame: 1,
  powerup: { shield: 500, crown: 800, speed: 600 },
};

const MOCK_PRICES = {
  solUsd: 180,
  playFee: { sol: 0.002 },
  revives: [
    { sol: 0.002, bird: 1000 },
    { sol: 0.002, bird: 1000 },
    { sol: 0.002, bird: 1000 },
  ],
  powerup: { sol: 0.006, bird: 800 },
};

export const MockGameAPI = {
  async getPrices() { return MOCK_PRICES; },
  async getConfig() { return MOCK_CONFIG; },

  async isHolder() { return isHolder(); },

  async getDailyRespawnsLeft() {
    if (!isHolder()) return 0;
    const rec = loadDayCounter(LS_RESPAWNS);
    return Math.max(0, MOCK_CONFIG.holderFreeRespawnsPerDay - rec.count);
  },

  async useDailyRespawn() {
    const rec = loadDayCounter(LS_RESPAWNS);
    rec.count = (rec.count || 0) + 1;
    saveDayCounter(LS_RESPAWNS, rec);
    return true;
  },

  async authorizePlay(loadout) {
    const holder = isHolder();
    const plays = loadDayCounter(LS_PLAYS);
    const freeLeft = Math.max(0, MOCK_CONFIG.nonHolderFreePlaysPerDay - plays.count);
    let paidPlay = false;

    if (!holder) {
      if (freeLeft > 0) {
        plays.count += 1;
        saveDayCounter(LS_PLAYS, plays);
      } else {
        paidPlay = true;
        await new Promise(r => setTimeout(r, 300));
      }
    }

    const session = {
      sessionId: `mock_${Date.now()}`,
      seed: makeSeed(),
      paidPlay,
      isHolder: holder,
    };
    saveSession(session);

    return {
      authorized: true,
      cost: paidPlay ? MOCK_CONFIG.playFeeSol : 0,
      sessionId: session.sessionId,
      seed: session.seed,
      isHolder: holder,
      loadout: loadout ?? [],
    };
  },

  async getReviveQuote() {
    const s = loadSession();
    if (!s) return null;
    const revivesUsed = s.revivesUsed ?? 0;
    if (revivesUsed >= MOCK_CONFIG.maxRespawnsPerGame) return { maxedOut: true };
    const rank = revivesUsed + 1;
    const priceSol = MOCK_PRICES.revives[rank - 1]?.sol ?? 0.002;
    const priceBird = MOCK_PRICES.revives[rank - 1]?.bird ?? 1000;
    return {
      rank,
      priceSol,
      priceBird,
      priceSolUsd: +(priceSol * MOCK_PRICES.solUsd).toFixed(2),
    };
  },

  async buyPaidRespawn(method) {
    const s = loadSession();
    if (!s) return { success: false, error: 'no session' };
    if ((s.revivesUsed ?? 0) >= MOCK_CONFIG.maxRespawnsPerGame) {
      return { success: false, error: 'max revives reached' };
    }
    await new Promise(r => setTimeout(r, 400));
    s.revivesUsed = (s.revivesUsed ?? 0) + 1;
    saveSession(s);
    return { success: true, txId: 'mock_tx_' + Date.now(), rank: s.revivesUsed };
  },

  async buyPowerup(type, method = 'bird') {
    await new Promise(r => setTimeout(r, 300));
    return { success: true, type, method, txSignature: 'mock_pu_' + Date.now() };
  },

  async submitScore(payload) {
    const s = loadSession();
    if (!s?.sessionId) return { error: 'no session', score: 0, games: 0 };

    const stats = loadStats();
    const bestScore = Math.max(stats.bestScore || 0, payload.claimedScore || 0);
    const totalGames = (stats.totalGames || 0) + 1;

    saveStats({ bestScore, totalGames });
    saveSession(null);

    return {
      verified: true,
      score: payload.claimedScore || 0,
      games: totalGames,
      rank: Math.floor(Math.random() * 100) + 1,
    };
  },

  async getStats() {
    const s = loadStats();
    return {
      score: s.bestScore || 0,
      games: s.totalGames || 0,
    };
  },

  async getMe() {
    const s = loadStats();
    return {
      isHolder: isHolder(),
      bestScore: s.bestScore || 0,
      totalGames: s.totalGames || 0,
      streak: 0,
      nearMiss: null,
      prizeEstimate: 0,
    };
  },

  async getLeaderboard(window = 'daily', limit = 25) {
    const rows = Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      rank: i + 1,
      wallet: `${'X'.repeat(4)}…${Math.random().toString(36).slice(2, 6)}`,
      score: Math.floor(500 - i * 37 - Math.random() * 20),
    }));
    return { window, rows };
  },

  _getSession() { return loadSession(); },
};