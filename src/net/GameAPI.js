// ============================================================
// GameAPI — HTTP client for the backend + orchestrates on-chain
// payment txs via AuthBridge (Privy embedded wallet or Phantom).
//
// Every public method preserves the signature that GameScene /
// MenuScene / UIScene already use so the Phaser code never changes.
// ============================================================
import { AuthBridge } from '../auth/AuthBridge.js';
import { buildSplitPayment, buildBirdBurn } from '../chain/buildTx.js';
import { RESPAWN, FEES } from '../../config.js';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// -----------------------------------------------------------
// HTTP helper — includes Privy JWT on every call
// -----------------------------------------------------------
async function http(path, opts = {}) {
  const token = await AuthBridge.getAccessToken();
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

// -----------------------------------------------------------
// In-memory + sessionStorage mirror of the active session
// -----------------------------------------------------------
let _session = null;
function loadSession() {
  if (_session) return _session;
  try {
    const raw = sessionStorage.getItem('pb_session');
    if (raw) _session = JSON.parse(raw);
  } catch {}
  return _session;
}
function saveSession(s) {
  _session = s;
  if (s) sessionStorage.setItem('pb_session', JSON.stringify(s));
  else sessionStorage.removeItem('pb_session');
}

// -----------------------------------------------------------
// Pricing cache (backend is the source of truth)
// -----------------------------------------------------------
let _prices = null;
async function prices() {
  if (_prices) return _prices;
  try { _prices = await http('/meta/prices'); return _prices; }
  catch { return null; }
}

// -----------------------------------------------------------
// Price-fetch helpers (fallback to config if backend unreachable)
// -----------------------------------------------------------
async function revivePriceSol(rank) {
  const p = await prices();
  return p?.revives?.[rank - 1]?.sol ?? (rank === 1 ? 0.003 : rank === 2 ? 0.006 : 0.012);
}
async function revivePriceBird(rank) {
  const p = await prices();
  return p?.revives?.[rank - 1]?.bird ?? (rank === 1 ? 500 : rank === 2 ? 1000 : 2000);
}

export const GameAPI = {
  // =========================================================
  // Meta
  // =========================================================
  async getPrices() { return prices(); },
  async getConfig() {
    try { return await http('/meta/config'); } catch { return null; }
  },

  // =========================================================
  // Holder status + leaderboard stats
  // =========================================================
  async isHolder() {
    try { return !!(await http('/leaderboard/me'))?.isHolder; }
    catch { return false; }
  },

  async getDailyRespawnsLeft() {
    try {
      const me = await http('/leaderboard/me');
      const cfg = await this.getConfig();
      if (!me?.isHolder) return 0;
      return cfg?.freeRespawnsPerDayHolder ?? RESPAWN.DAILY_HOLDER_CAP;
    } catch {
      return 0;
    }
  },

  async useDailyRespawn() {
    const s = loadSession();
    if (!s) throw new Error('no active session');
    await http('/entitlement/revive', {
      method: 'POST',
      body: JSON.stringify({ sessionId: s.sessionId, method: 'free' }),
    });
    return true;
  },

  // =========================================================
  // Authorize a new play session
  //  1. Try /session/start with no payment → server returns 200 if free
  //  2. If 402 → build SOL transfer, sign+send via Privy, retry with txSig
  //  3. Optionally forward pre-purchased loadout receipts (tx sigs + types)
  // =========================================================
  async authorizePlay(loadout /* [{type, method, txSignature}] | undefined */) {
    try {
      const bodyArg = {};
      if (Array.isArray(loadout) && loadout.length > 0) bodyArg.loadout = loadout;

      let body;
      try {
        body = await http('/session/start', { method: 'POST', body: JSON.stringify(bodyArg) });
      } catch (err) {
        if (err.status === 402) {
          // Payment required — build atomic 3-way split tx
          const priceSol = err.body?.priceSol ?? 0.005;
          const fromWallet = AuthBridge.walletAddress();
          if (!fromWallet) throw new Error('no wallet available');
          const tx = await buildSplitPayment(fromWallet, priceSol);
          const sig = await AuthBridge.signAndSend(tx);
          body = await http('/session/start', {
            method: 'POST',
            body: JSON.stringify({ ...bodyArg, paymentTx: sig }),
          });
        } else { throw err; }
      }
      saveSession({
        sessionId: body.sessionId,
        seed: body.seed,
        paidPlay: body.paidPlay,
        isHolder: body.isHolder,
      });
      return {
        authorized: true,
        cost: body.paidPlay ? 0.005 : 0,
        sessionId: body.sessionId,
        seed: body.seed,
        isHolder: body.isHolder,
        loadout: body.loadout ?? [],
      };
    } catch (err) {
      console.error('[GameAPI] authorizePlay failed:', err);
      return { authorized: false, error: err.message };
    }
  },

  // Quote for the next revive (returns rank, SOL price, $BIRD price, USD equivalents).
  async getReviveQuote() {
    const s = loadSession();
    if (!s) return null;
    try {
      const quote = await http(`/entitlement/revive/quote/${s.sessionId}`);
      if (quote?.maxedOut) return { maxedOut: true };
      const p = await prices();
      const solUsd = p?.solUsd ?? 0;
      return {
        ...quote,
        priceSolUsd: +((quote.priceSol ?? 0) * solUsd).toFixed(2),
      };
    } catch (err) {
      return null;
    }
  },

  // =========================================================
  // Paid revive — escalating cost based on server-side revive count
  // =========================================================
  async buyPaidRespawn(method /* 'bird' | 'sol' */) {
    const s = loadSession();
    if (!s) return { success: false, error: 'no session' };

    // Fetch the next revive rank + price from the server
    let quote;
    try { quote = await http(`/entitlement/revive/quote/${s.sessionId}`); }
    catch (err) { return { success: false, error: err.message }; }
    if (quote.maxedOut) return { success: false, error: 'max revives reached' };

    const fromWallet = AuthBridge.walletAddress();
    if (!fromWallet) return { success: false, error: 'no wallet' };

    try {
      let tx;
      if (method === 'sol') {
        tx = await buildSplitPayment(fromWallet, quote.priceSol);
      } else {
        tx = await buildBirdBurn(fromWallet, quote.priceBird);
      }
      const sig = await AuthBridge.signAndSend(tx);
      await http('/entitlement/revive', {
        method: 'POST',
        body: JSON.stringify({ sessionId: s.sessionId, method, txSignature: sig }),
      });
      return { success: true, txId: sig, rank: quote.rank };
    } catch (err) {
      console.error('[GameAPI] buyPaidRespawn failed:', err);
      return { success: false, error: err.message };
    }
  },

  // =========================================================
  // Pre-game powerup purchase. User clicks an item on the Game Over
  // shop → we build + sign the payment tx NOW, return the receipt.
  // The tx signature is stashed alongside the type in the loadout
  // and forwarded to /session/start on the next authorizePlay.
  // =========================================================
  async buyPowerup(type, method = 'bird') {
    const fromWallet = AuthBridge.walletAddress();
    if (!fromWallet) return { success: false, error: 'no wallet' };
    const p = await prices();
    const priceSol = p?.powerup?.sol ?? 0.006;
    const priceBird = p?.powerup?.bird ?? 800;
    try {
      let tx;
      if (method === 'sol') {
        tx = await buildSplitPayment(fromWallet, priceSol);
      } else {
        tx = await buildBirdBurn(fromWallet, priceBird);
      }
      const txSignature = await AuthBridge.signAndSend(tx);
      return { success: true, type, method, txSignature };
    } catch (err) {
      console.error('[GameAPI] buyPowerup failed:', err);
      return { success: false, error: err.message };
    }
  },

  // =========================================================
  // Score submit
  // =========================================================
  async submitScore(payload) {
    const s = loadSession();
    if (!s?.sessionId) return { error: 'no session', score: 0, pop: 0, games: 0 };
    try {
      const result = await http('/score/submit', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: s.sessionId,
          claimedScore: payload.claimedScore,
          claimedPop: payload.claimedPop,
          claimedFrames: payload.claimedFrames,
          inputs: payload.inputs,
        }),
      });
      saveSession(null);
      return result;
    } catch (err) {
      console.error('[GameAPI] submitScore failed:', err);
      saveSession(null);
      return { error: err.message, score: 0, pop: 0, games: 0 };
    }
  },

  async getStats() {
    try {
      const me = await http('/leaderboard/me');
      return { score: me?.bestScore ?? 0, pop: me?.totalPop ?? 0, games: me?.totalGames ?? 0 };
    } catch {
      return { score: 0, pop: 0, games: 0 };
    }
  },

  // Full /me — includes streak, ranks, near-miss numbers, prize estimate
  async getMe() {
    try { return await http('/leaderboard/me'); }
    catch { return null; }
  },

  async getLeaderboard(window = 'daily', limit = 25) {
    try { return await http(`/leaderboard?window=${window}&limit=${limit}`); }
    catch { return { window, rows: [] }; }
  },

  _getSession() { return loadSession(); },
};
