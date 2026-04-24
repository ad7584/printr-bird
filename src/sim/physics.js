// ============================================================
// MIRROR of printr-bird-backend/src/sim/physics.js.
// Keep byte-for-byte. Any drift breaks replay verification.
// ============================================================

export const SIM = {
  DT: 1 / 60,
  WIDTH: 480,
  HEIGHT: 800,

  GRAVITY: 700,
  FLAP_VEL: -260,
  MAX_FALL: 600,
  BIRD_START_X_RATIO: 0.28,
  BIRD_HITBOX_R: 17,

  SPEED_BASE: 90,
  SPEED_MAX: 220,
  SPEED_RAMP_SCORE: 60,
  SPEED_PU_MULT: 1.25,

  PIPE_WIDTH: 62,
  PIPE_INTERVAL_PX: 240,
  PIPE_GAP_MAX: 210,
  PIPE_GAP_MIN: 140,
  PIPE_MARGIN: 70,

  POP_SPAWN_CHANCE: 0.6,
  POWERUP_SPAWN_CHANCE: 0.08,
  PICKUP_HITBOX_R: 12,
  POP_Y_JITTER: 30,

  POWERUP_DURATION_FRAMES: Math.round(8000 / (1000 / 60)),
  PRE_GAME_POWERUP_FRAMES: Math.round(12000 / (1000 / 60)),
  RESPAWN_SHIELD_FRAMES: Math.round(2000 / (1000 / 60)),
  CROWN_MULT: 2,

  MAX_REVIVES_PER_RUN: 3,
};

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }

export function getSpeed(score, hasSpeedPu) {
  const t = clamp(score / SIM.SPEED_RAMP_SCORE, 0, 1);
  const s = lerp(SIM.SPEED_BASE, SIM.SPEED_MAX, t);
  return hasSpeedPu ? s * SIM.SPEED_PU_MULT : s;
}

export function getGap(score) {
  const t = clamp(score / SIM.SPEED_RAMP_SCORE, 0, 1);
  return lerp(SIM.PIPE_GAP_MAX, SIM.PIPE_GAP_MIN, t);
}

export function spawnPipe(rng, score) {
  const gapH = getGap(score);
  const margin = SIM.PIPE_MARGIN;

  const r1 = rng();
  const gapY = margin + r1 * (SIM.HEIGHT - gapH - margin * 2);

  const r2 = rng();
  const popSpawn = r2 < SIM.POP_SPAWN_CHANCE;

  const r3 = rng();
  const popOffsetY = (r3 - 0.5) * SIM.POP_Y_JITTER;

  const r4 = rng();
  const powerupSpawn = r4 < SIM.POWERUP_SPAWN_CHANCE;

  const r5 = rng();
  const types = ['shield', 'crown', 'speed'];
  const powerupType = types[Math.floor(r5 * types.length)];

  return {
    gapY,
    gapH,
    popSpawn,
    popOffsetY,
    powerupSpawn,
    powerupType: powerupSpawn ? powerupType : null,
  };
}
