# Printr Bird — $BIRD

**Fly. Print. Repeat.**

Phaser 3 Flappy Bird-style game for the Printr ecosystem. Brand-matched visuals, pre-wired for Solana onchain integration.

## Quick start

Because ES6 modules don't work over `file://`, you need to serve over HTTP:

```bash
# Option A — Python (no install needed on Mac/Linux)
cd printr-bird
python3 -m http.server 8000

# Option B — Node
cd printr-bird
npx serve .

# Option C — VSCode
# Right-click index.html → "Open with Live Server"
```

Then open: **http://localhost:8000**

## Project structure

```
printr-bird/
├── index.html                    ← entry HTML, loads Phaser from CDN
├── main.js                       ← Phaser.Game config + scene registration
├── config.js                     ← ALL tunable numbers (speed, gravity, prices, colors)
├── style.css                     ← HTML-overlay styling (brand kit)
├── src/
│   ├── scenes/
│   │   ├── BootScene.js          ← registry setup
│   │   ├── PreloadScene.js       ← loads textures (procedural for Phase 1)
│   │   ├── MenuScene.js          ← main menu with stats
│   │   ├── GameScene.js          ← gameplay (pipes, collision, scoring)
│   │   └── UIScene.js            ← HUD + respawn/gameover overlays (runs on top)
│   ├── objects/
│   │   ├── Bird.js               ← bird entity, procedurally drawn
│   │   ├── Pipe.js               ← pipe pair, neon-gate Graphics
│   │   ├── Pickup.js             ← $POP flame + powerup orbs
│   │   └── Background.js         ← parallax starfield + grid
│   └── net/
│       └── GameAPI.js            ← STUB for all onchain/server calls
└── assets/                       ← empty; drop sprite PNGs here in Phase 2
```

## Tuning the feel

All gameplay constants are in **`config.js`**. Current tuning = calm start, gentle ramp:

- `PHYSICS.GRAVITY: 700` (px/s²) — lower = floatier
- `PHYSICS.FLAP_VEL: -260` — flap impulse
- `SPEED.BASE: 90` — starting scroll speed (px/s)
- `SPEED.MAX: 220` — cap
- `SPEED.RAMP_SCORE: 60` — score at which max is reached
- `PIPES.GAP_MAX: 210` → `GAP_MIN: 140` — gap shrinks over ramp
- `PIPES.INTERVAL_PX: 240` — distance between pipes

If it feels wrong, change numbers, refresh, re-test. No rebuild step.

## Phase 2 — drop in your sprite sheet

All procedural drawing is isolated to two places:
1. `src/objects/Bird.js` → `redraw()` method
2. `src/objects/Pipe.js` → `draw()` method

To swap in real sprites:
1. Drop your PNGs into `assets/`
2. In `src/scenes/PreloadScene.js`, replace the procedural texture generation with `this.load.image('bird_idle', 'assets/idle.png')` etc. (see comment block in that file)
3. In Bird.js, replace the `redraw()` body with `this.setTexture('bird_flap_up')` or use Phaser animations
4. Done. Game logic untouched.

## Phase 3 — onchain

Every onchain call routes through `src/net/GameAPI.js`:

| Method | Phase 3 implementation |
|---|---|
| `isHolder()` | Phantom connect → check SPL $BIRD balance ≥ threshold |
| `authorizePlay()` | Non-holders → sign 0.001 SOL tx to treasury |
| `getDailyRespawnsLeft()` | Query server or on-chain PDA |
| `buyPaidRespawn('bird')` | Burn $BIRD by sending to `1nc1nerator11111111111111111111111111111111` |
| `buyPaidRespawn('sol')` | Send SOL to treasury |
| `buyPowerup(type, method)` | Same pattern |
| `submitScore(s, p, replay)` | POST to leaderboard backend; server re-simulates replay to validate |

Game code doesn't touch Phantom or SPL tokens. Clean swap.

## Dev helper

The **Holder: OFF/ON** pill at bottom-left toggles the `isHolder()` stub so you can test both flows (free play + 3 daily respawns vs paid). Remove from `style.css` + `index.html` + `main.js` when real wallet connect is wired.

## Current build: Phase 1

- ✅ Classic Flappy physics, tuned calm at start
- ✅ Procedural pipes (random gap position every time)
- ✅ Speed + gap difficulty curve
- ✅ $POP pickups and shield/crown/speed power-ups
- ✅ 5-second respawn window with free/paid options
- ✅ 3 daily free respawns for holders (local stub), 1 respawn max per game
- ✅ Pre-game loadout shop on Game Over
- ✅ Local leaderboard stub (best, total $POP, games played)
- ✅ Procedural sound effects (Web Audio)
- ✅ Printr brand kit (Space Grotesk + Inter, pink/purple/blue/cyan)

## Phase 2 — visual polish
- Drop in your actual PNG spritesheet
- Color variants (Classic/Golden/Electric/Toxic) tied to holder tiers
- More particle juice

## Phase 3 — onchain
- Phantom wallet connect
- Real $BIRD balance check
- Paid plays + paid respawns with burn
- Backend leaderboard with replay validation
- Daily reward distribution

---

Built on **Printr** · `$BIRD`
