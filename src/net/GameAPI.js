// ============================================================
// GameAPI — STUB for all onchain/server calls.
// This is the SINGLE integration point for Phase 3.
// Game code never touches wallets or tokens directly — only this.
//
// Phase 3 TODO:
//   - Wire Phantom wallet connect
//   - Replace stubs with Solana web3.js calls (SPL balance check, burn tx, etc.)
//   - Point submitScore at your leaderboard backend with replay validation
// ============================================================

import { RESPAWN, FEES } from '../../config.js';

export const GameAPI = {
  // Phase 3: connect Phantom, query SPL $BIRD token balance, compare to holder threshold
  async isHolder(){
    return localStorage.getItem('pb_holder') === '1';
  },

  // Phase 3: check server or on-chain PDA for daily respawn usage
  async getDailyRespawnsLeft(){
    const today = new Date().toDateString();
    const record = JSON.parse(localStorage.getItem('pb_respawns') || '{}');
    if (record.date !== today){
      record.date = today;
      record.used = 0;
      localStorage.setItem('pb_respawns', JSON.stringify(record));
    }
    const holder = await this.isHolder();
    const cap = holder ? RESPAWN.DAILY_HOLDER_CAP : RESPAWN.DAILY_NON_HOLDER_CAP;
    return Math.max(0, cap - (record.used || 0));
  },

  async useDailyRespawn(){
    const today = new Date().toDateString();
    const record = JSON.parse(localStorage.getItem('pb_respawns') || '{}');
    if (record.date !== today){ record.date = today; record.used = 0; }
    record.used = (record.used || 0) + 1;
    localStorage.setItem('pb_respawns', JSON.stringify(record));
    return true;
  },

  // Phase 3: build signed tx
  //   - 'bird' → send RESPAWN.COSTS.BIRD_BURN $BIRD to burn address
  //     (1nc1nerator11111111111111111111111111111111 on Solana)
  //   - 'sol'  → send RESPAWN.COSTS.SOL SOL to treasury
  async buyPaidRespawn(method /* 'bird' | 'sol' */){
    // Stub: always succeeds. In production, await tx confirmation.
    return { success: true, txId: 'stub_' + Date.now() };
  },

  // Phase 3: same pattern as respawn
  async buyPowerup(type, method){
    return { success: true };
  },

  // Phase 3: POST score + replay to your backend
  //   Backend re-simulates the replay deterministically to verify
  //   the score is achievable (anti-cheat)
  async submitScore(score, pop, replay){
    const record = JSON.parse(
      localStorage.getItem('pb_best') || '{"score":0,"pop":0,"games":0}'
    );
    if (score > record.score) record.score = score;
    record.pop = (record.pop || 0) + pop;
    record.games = (record.games || 0) + 1;
    localStorage.setItem('pb_best', JSON.stringify(record));
    return record;
  },

  async getStats(){
    return JSON.parse(
      localStorage.getItem('pb_best') || '{"score":0,"pop":0,"games":0}'
    );
  },

  // Phase 3: non-holders sign a 0.001 SOL tx before getting play authorization
  async authorizePlay(){
    const holder = await this.isHolder();
    if (holder) return { authorized: true, cost: 0 };
    // Stub: in production, await confirmed tx before returning authorized:true
    return { authorized: true, cost: FEES.NON_HOLDER_PLAY_SOL };
  },
};
