// ============================================================
// PRINTR BIRD — central config
// ALL tunable numbers live here. Change, refresh, done.
// ============================================================

export const GAME = {
  WIDTH: 480,
  HEIGHT: 800,
  BG_COLOR: 0x05020a,
};

// Physics — calm at start, forgiving feel
export const PHYSICS = {
  GRAVITY: 700,        // px/s² — Phaser uses seconds, so lower than per-frame value
  FLAP_VEL: -260,      // px/s — flap impulse
  MAX_FALL: 600,       // cap on fall speed so it never feels like a rocket
};

export const BIRD = {
  START_X_RATIO: 0.28,
  VISUAL_R: 22,
  HITBOX_R: 17,
};

// Scroll speed curve — starts slow, ramps up
export const SPEED = {
  BASE: 90,            // px/s at start (was ~120 in vanilla build; Phaser uses real time)
  MAX: 220,            // px/s cap
  RAMP_SCORE: 60,      // score at which max is reached
  SPEED_PU_MULT: 1.25, // extra scroll during speed powerup
};

export const PIPES = {
  WIDTH: 62,
  INTERVAL_PX: 240,    // distance between pipes in pixels (converted to ms via speed)
  GAP_MAX: 210,        // starting gap (big, forgiving)
  GAP_MIN: 140,        // gap at max difficulty
  CAP_HEIGHT: 24,
};

export const RESPAWN = {
  WINDOW_MS: 5000,
  DAILY_HOLDER_CAP: 3,
  DAILY_NON_HOLDER_CAP: 0,
  MAX_PER_GAME: 1,
  GRACE_SHIELD_MS: 2000,
  COSTS: {
    BIRD_BURN: 1000,
    SOL: 0.0005,
  },
};

export const POWERUPS = {
  DURATION_MS: 8000,
  PRE_GAME_DURATION_MS: 12000,
  SPAWN_CHANCE: 0.08,
  SHOP: [
    { type:'shield', icon:'🛡', name:'Shield', price:'500 $BIRD' },
    { type:'crown',  icon:'👑', name:'2x Score', price:'800 $BIRD' },
    { type:'speed',  icon:'⚡', name:'Speed',  price:'600 $BIRD' },
  ],
};

export const PICKUPS = {
  POP_SPAWN_CHANCE: 0.6,
  CROWN_MULT: 2,
};

export const FEES = {
  NON_HOLDER_PLAY_SOL: 0.001,
};

// Brand colors used by procedural drawing
export const COLORS = {
  PINK: 0xFF1E8E,
  PURPLE: 0x8B5CF6,
  BLUE: 0x3B82F6,
  CYAN: 0x00F0FF,
  GOLD: 0xFFD700,
  BIRD_BODY_DARK: 0x000000,
  BIRD_BODY_MID: 0x1a0a2e,
  BIRD_BEAK_DARK: 0x1e40af,
  PIPE_PURPLE_LIGHT: 0x8B5CF6,
  PIPE_PURPLE_MID: 0x4a1260,
  PIPE_PURPLE_DARK: 0x2a0a3a,
  PIPE_CAP_TOP: 0x6C28D9,
};
