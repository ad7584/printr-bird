# Printr Bird — $BIRD

**Fly. Print. Repeat.**

Phaser 3 Flappy Bird-style game with **Privy wallet auth + Solana integration** for the Printr ecosystem.

## Quick start

```bash
cp .env.example .env        # fill in VITE_PRIVY_APP_ID, VITE_BIRD_MINT, VITE_TREASURY_WALLET
npm install
npm run dev                 # Vite dev server on http://localhost:5173
```

You also need the backend running (sibling repo `printr-bird-backend/`). See its `README.md`.

## Architecture

Vite-bundled React app that hosts a Phaser 3 game. Privy handles wallet auth (email / google / X / Phantom → embedded Solana wallet). Every on-chain action (play fee, paid revive, $BIRD burn) routes through the Privy SDK.

```
index.html
├── src/main.jsx                ← React root
├── src/App.jsx                 ← PrivyProvider, layout
├── src/react/
│   ├── BridgeSync.jsx          ← copies Privy hook state → AuthBridge
│   ├── LoginGate.jsx           ← blocks canvas until signed in
│   ├── GameShell.jsx           ← mounts Phaser once auth'd
│   ├── WalletBadge.jsx         ← top-right wallet pill
│   └── BrandFooter.jsx
├── src/auth/AuthBridge.js      ← imperative bridge (Privy → non-React code)
├── src/chain/buildTx.js        ← SOL transfer + $BIRD burn constructors
├── src/net/GameAPI.js          ← HTTP client; orchestrates tx signing
├── src/sim/                    ← seeded RNG + physics (MIRROR of backend)
├── src/phaser/bootstrap.js     ← Phaser.Game initializer
├── src/scenes/                 ← Boot / Preload / Menu / Game / UI
├── src/objects/                ← Bird / Pipe / Pickup / Background
├── config.js                   ← gameplay tuning
└── style.css                   ← global + overlay styles
```

## Environment

See `.env.example`. Required:
- `VITE_PRIVY_APP_ID` — from dashboard.privy.io
- `VITE_BIRD_MINT` — SPL address of $BIRD
- `VITE_TREASURY_WALLET` — SOL fee destination
- `VITE_BACKEND_URL` — defaults to `http://localhost:3000`

## How it plays

1. User lands on site → **LoginGate** overlay ("SIGN IN TO PLAY")
2. Click → Privy modal → email / google / X / Phantom
3. Embedded wallet created if needed; **WalletBadge** appears top-right
4. Phaser boots. Menu → tap → `GameAPI.authorizePlay()`
5. Server decides: free play (first-ever / daily quota / holder) or 402 payment required
6. On 402: `buildSolTransfer → AuthBridge.signAndSend → Privy signs → backend verifies tx`
7. Game runs with seeded RNG from server; inputs recorded frame-by-frame
8. On death: `submitScore` posts `{seed, inputs, claimedScore}`; backend re-simulates to verify

## Anti-cheat

- Client uses server-issued seed for all RNG (pipe gaps, pickup spawns)
- Shared physics module (`src/sim/`) runs identically in browser and Node
- Server re-simulates every submitted run; mismatches get rejected
- Top-3 weekly/daily payouts gated on holder status at payout time

## Phase 2 — visual polish
Drop your spritesheet into `assets/`, swap the procedural drawing in `Bird.js` + `Pipe.js`.

---

Built on **Printr** · `$BIRD`
