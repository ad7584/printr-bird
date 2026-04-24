# Printr Bird — Frontend Handoff

Everything backend + frontend is in place. **Your job**: wire a real Privy app, verify the end-to-end auth → signing → server loop works in a browser, then polish and ship.

## TL;DR — What's done

| Area | State |
|---|---|
| Phaser game | Done — existing Phase 1 gameplay, now fixed-step 60fps |
| Seeded RNG + input replay | Done — `src/sim/` mirrors backend byte-for-byte |
| Vite + React wrapper | Done — `src/App.jsx` is the root |
| Privy provider setup | **Done in code, needs App ID** — see `src/App.jsx` |
| Login gate UI | Done — `src/react/LoginGate.jsx` |
| Wallet badge + fund wallet | Done — `src/react/WalletBadge.jsx` |
| Solana tx builders | Done — `src/chain/buildTx.js` (SOL transfer, $BIRD burn) |
| HTTP client → backend | Done — `src/net/GameAPI.js` |
| Pre-game powerup on-chain flow | Done — clicks sign + burn; receipts forwarded to `/session/start` |
| PWA (installable, offline app shell, install prompt) | Done — icons are placeholders, see PWA section |
| Escalating revive prices (server-driven) | Done — rendered with USD + rank badge |
| Streak badge | Done — shown on Menu when current streak ≥ 2 |
| Near-miss panel | Done — shown on Game Over when within striking distance of prizes |
| AuthBridge singleton | Done — `src/auth/AuthBridge.js` |

## What you need to do

### 1. Create a Privy app
1. Go to https://dashboard.privy.io → **Create App**
2. Config you want:
   - Login methods: email, google, X (twitter), wallet
   - Wallet chain: **Solana only** (already configured in `App.jsx`)
   - Embedded wallets: create on login for users without wallets
3. From **Settings** tab, grab:
   - App ID → goes in `VITE_PRIVY_APP_ID`
   - App Secret → goes in backend's `PRIVY_APP_SECRET`

### 2. Set the env files

The treasury is split across **three** wallets, with SOL atomically routed by each user payment. See the "Treasury architecture" section below.

**Frontend** (`printr-bird/.env`):
```
VITE_PRIVY_APP_ID=<from-dashboard>
VITE_BACKEND_URL=http://localhost:3000
VITE_SOLANA_RPC_URL=<helius-or-public>
VITE_SOLANA_CLUSTER=mainnet-beta
VITE_BIRD_MINT=<your-SPL-mint-address>
VITE_OPS_MULTISIG=<Squads-vault-address>
VITE_BUYBACK_WALLET=<from-provision-wallets-script>
VITE_PRIZE_WALLET=<from-provision-wallets-script>
VITE_BURN_ADDRESS=1nc1nerator11111111111111111111111111111111
```

**Backend** (`printr-bird-backend/.env`):
```
PRIVY_APP_ID=<same-as-frontend>
PRIVY_APP_SECRET=<from-dashboard>
BIRD_MINT=<same-as-frontend>
OPS_MULTISIG_ADDRESS=<Squads-vault-address>
BUYBACK_WALLET_ADDRESS=<from-provision-wallets>
BUYBACK_WALLET_ID=<from-provision-wallets>
PRIZE_WALLET_ADDRESS=<from-provision-wallets>
PRIZE_WALLET_ID=<from-provision-wallets>
SOLANA_RPC_URL=<helius-recommended>
DATABASE_URL=postgres://...
REDIS_URL=redis://...
```

### 3. Provision the server signer wallets (one-time)

Two Privy-managed server wallets are needed (one for buyback, one for prize payouts). The third destination — the ops multisig — is created separately at app.squads.so.

```bash
cd printr-bird-backend
npm run provision:wallets
```

This creates both Privy wallets and prints the addresses + IDs. Paste them into both `.env` files.

**Fund each wallet with ~0.01 SOL** for tx fees. The buyback wallet will auto-accumulate more from user payments; the prize wallet does the same.

### 4. Create the Squads multisig

Go to [app.squads.so](https://app.squads.so), create a new multisig on mainnet with 2-of-3 threshold (you + 2 co-signers), and copy the vault address. That's your `OPS_MULTISIG_ADDRESS` (backend) / `VITE_OPS_MULTISIG` (frontend).

## Treasury architecture — 3-way atomic split

Every user SOL payment is **one transaction** with **three transfer instructions** that cryptographically enforce the split at payment time. No wallet ever holds the combined amount.

```
User pays N SOL (single tx, 3 atomic transfers):
  ├── N × 20%  → OPS_MULTISIG     (Squads vault, 2-of-3 human co-sign)
  ├── N × 50%  → BUYBACK_WALLET   (Privy, auto-signs Jupiter swap + burn)
  └── N × 30%  → PRIZE_WALLET     (Privy, auto-signs SOL→winners)
```

The backend verifies every submitted tx signature contains all three transfers with exact amounts before granting the entitlement. Backend rejects if any instruction is missing or off-amount.

**Blast radius per wallet:**
- **Ops multisig** — protected by 2-of-3 signature requirement. Never auto-signs.
- **Buyback wallet** — worst-case compromise: attacker swaps + burns $BIRD. Can't steal, only accelerate deflation.
- **Prize wallet** — worst-case compromise: attacker drains ≤ 1 week of prize pool (~5–15 SOL steady-state).

Split basis points (`SPLIT_OPS_BPS=2000` / `SPLIT_BUYBACK_BPS=5000` / `SPLIT_PRIZE_BPS=3000`) must match on frontend + backend. They're exposed to the client via `/meta/config.treasury` so the backend is the source of truth — you can rotate wallet addresses without redeploying the frontend (users will just need to refresh to pick up the new `/meta/config`).

## Bring up the stack
```bash
# Backend
cd printr-bird-backend
docker compose up -d           # postgres + redis
npm install
npm run db:init                # creates schema
npm run dev                    # api on :3000
# In a second terminal:
npm run workers                # buyback + payouts + reconcile cron

# Frontend
cd ../printr-bird
npm install
npm run dev                    # vite on :5173
```

Open http://localhost:5173, sign in with email, play.

## Architecture reference

```
React tree (src/App.jsx)
├── PrivyProvider
├── BridgeSync          ← mirrors Privy hook state → AuthBridge singleton
├── GameShell           ← mounts Phaser into #game when authenticated
├── LoginGate           ← overlay until authenticated
└── WalletBadge         ← wallet pill, add funds, sign out

AuthBridge (src/auth/AuthBridge.js)
    - getAccessToken() → Privy JWT
    - signAndSend(tx) → Privy popup-free signing
    - walletAddress(), login(), logout(), openWalletFunding()

Phaser scenes read from AuthBridge indirectly via:
    GameAPI (src/net/GameAPI.js)
        - authorizePlay(loadout?)
        - buyPaidRespawn(method)
        - buyPowerup(type, method)
        - submitScore({ seed, inputs, ... })
        - getMe(), getStats(), getLeaderboard()
```

## Anti-cheat model

1. `/session/start` returns a 32-bit **seed**
2. Phaser's `GameScene.create` uses `createRng(seed)` for ALL random decisions
3. Every flap gets recorded as `{frame: this.frame + 1, type: 'flap'}`
4. On death, the client posts `{seed, inputs, claimedScore, claimedPop, claimedFrames}` to `/score/submit`
5. Backend re-simulates in Node using the same seed + inputs → compares to claimed
6. Mismatches get rejected, never land on the leaderboard

Physics constants live in **two** places that must stay in sync:
- `printr-bird/src/sim/physics.js` (client)
- `printr-bird-backend/src/sim/physics.js` (server)

I've added a big warning to `config.js`. If you tune physics, change all three files.

## Solana tx flows (already wired)

### Play fee (non-holder, no free plays left)
1. `GameAPI.authorizePlay()` → `POST /session/start` with no payment
2. Server returns `402 { priceSol: 0.005 }`
3. Client: `buildSplitPayment(user, 0.005)` emits a tx with 3 SystemProgram transfers (ops/buyback/prize) → `AuthBridge.signAndSend(tx)` → signature
4. Client retries `POST /session/start { paymentTx: sig }`
5. Server's `verifySplitPayment` checks all 3 transfers + exact amounts on-chain, writes to `tx_log`, issues session

### Paid revive — SOL path (escalating rank)
1. `GameAPI.buyPaidRespawn('sol')`
2. Client fetches `/entitlement/revive/quote/:sessionId` to learn the rank price
3. Builds a split-payment tx via `buildSplitPayment`
4. Signs via Privy, posts tx sig to `/entitlement/revive`
5. Server re-runs `verifySplitPayment` for the rank price, increments `revives_granted`

### Paid revive — $BIRD path
1. Same as above, but `buildBirdBurn` emits an SPL `burnChecked` from the user's own ATA
2. Server's `verifyBirdBurn` checks the burn instruction, amount, owner

### Pre-game powerup — $BIRD path
1. On Game Over screen, user taps a shop item
2. `GameAPI.buyPowerup(type, 'bird')` builds SPL burn tx, signs immediately
3. Receipt `{type, method, txSignature}` is stashed in Phaser registry
4. When user clicks "Play Again", loadout + receipts are sent to `/session/start`
5. Server verifies each burn tx and includes the powerups in the new session

## Known sharp edges

- **Privy Solana SDK shape**: I used the current v2 API (`useSolanaWallets`, `useSendTransaction`, `toSolanaWalletConnectors`). If Privy changes it under you, the only file that needs updating is `src/react/BridgeSync.jsx` — AuthBridge consumers are stable.
- **Tx confirmation latency**: `verifySolTransfer` retries up to 3× with backoff because RPC propagation can lag the client's `confirmed` commitment by ~1–2s. If your Helius endpoint is fast this is moot.
- **$BIRD decimals**: currently hardcoded to 6 in `src/chain/buildTx.js` (`VITE_BIRD_DECIMALS`). Most meme mints are 6 or 9. If yours differs, set the env var.
- **No Phaser teardown on logout**: game stays mounted. If you want logout to kill the Phaser instance, add `_gameInstance?.destroy(true)` in `src/phaser/bootstrap.js` and call it from `GameShell` on `!authenticated`.
- **Anonymous first play**: currently login required before any play. "First play free" logic runs on the first authenticated play. If you want zero-friction try-before-signup, add a device-fingerprinted anonymous session endpoint — but that's a real decision, not a bug.

## PWA (installable app)

The frontend is a fully-installable PWA. Users can "Add to Home Screen" on iOS/Android and launch it in standalone mode (no browser chrome). A subtle install banner auto-appears on Chrome/Edge/Android via `beforeinstallprompt`; iOS Safari gets a "Share → Add to Home Screen" hint instead.

**Config** (all in `vite.config.js`):
- `registerType: 'autoUpdate'` — when you redeploy, clients auto-reload the new SW on next navigation (no update prompt shown to user)
- Precaches: all JS/CSS/SVG/PNG/WOFF2 from the Vite build (~5.3 MB total)
- Runtime cache: Google Fonts (CacheFirst, 1yr), backend `/meta/*` (NetworkFirst, 24h, 4s network timeout)
- **Never cached**: `/session/*`, `/entitlement/*`, `/score/*`, `/leaderboard/me` — these need live state

**Dev**: PWA disabled in dev mode (set `devOptions.enabled: true` in `vite.config.js` if you need to test SW behavior locally). Run `npm run build && npm run preview` to test the full PWA experience; Chrome DevTools → Application → Service Workers/Manifest to inspect.

**Icons (placeholder)**: `public/favicon.svg` is a quick on-brand placeholder. The manifest points at `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`, and `apple-touch-icon-180.png` — these don't exist yet. See `public/icons/README.md` for drop-in instructions. Once your designer hands over a 1024×1024 source PNG at `public/icon-source.png`, run `npm run pwa:icons` to auto-generate every required size.

**Install banner**: `src/react/PWAInstallBanner.jsx` — shown once, dismissal persists in `localStorage[pb_install_dismissed]`. Remove the component from `App.jsx` if you want to suppress it entirely.

**Offline behavior**: loading the app shell works offline (precached). Playing a game offline does NOT work — `/session/start` requires live backend auth + server-issued seed. Intentional; that's the anti-cheat model. If the user loses connection mid-game, the in-flight Phaser run continues locally but score submission will fail with a console error and a lost run.

**HTTPS**: required in production. Service workers refuse to register over `http://` except on `localhost`. Whatever host you deploy to (Vercel, Cloudflare Pages, Fly.io, Netlify) must serve HTTPS by default — all of those do.

**iOS quirks**:
- Apple doesn't fire `beforeinstallprompt`. The iOS hint appears after 10s if the user isn't already in standalone mode.
- Safari respects `theme-color` for the status bar and `apple-mobile-web-app-status-bar-style: black-translucent` for the notch area.
- iOS 16.4+ is the first version with usable PWA push notifications and service workers for standalone apps — worth knowing if you later want push notifications for tournament results.

## Open v2 items (not blocking ship)

- Code-split the Vite bundle (currently 4.3 MB minified from Privy + Solana SDKs) — use `rollupOptions.output.manualChunks`
- Rewarded X-share for free revive (Privy can confirm via Twitter login; backend needs an endpoint)
- NFT skins tied to holder tiers
- Admin dashboard for viewing sessions, burns, payouts
- Monthly tournament with separate prize pool
- Referral system

## Files you'll probably touch

| Purpose | File |
|---|---|
| Privy config | `src/App.jsx` |
| Login UI | `src/react/LoginGate.jsx` |
| Wallet UI | `src/react/WalletBadge.jsx` |
| Auth bridge (Privy ↔ non-React) | `src/react/BridgeSync.jsx`, `src/auth/AuthBridge.js` |
| HTTP + tx orchestration | `src/net/GameAPI.js` |
| Client-side tx construction | `src/chain/buildTx.js` |
| Game scenes | `src/scenes/*.js` |

## Support

Backend OpenAPI-ish endpoints (no swagger yet; read `src/routes/*` for full shape):
- `GET /meta/prices` — public; SOL/USD + all prices
- `GET /meta/config` — public; quotas + threshold + addresses
- `POST /session/start` — auth; body `{paymentTx?, loadout?: [{type,method,txSignature}]}`
- `POST /entitlement/revive` — auth; body `{sessionId, method, txSignature?}`
- `GET /entitlement/revive/quote/:sessionId` — auth; returns next rank's price
- `POST /score/submit` — auth; body `{sessionId, claimedScore, claimedPop, claimedFrames, inputs}`
- `GET /leaderboard?window=daily|weekly|alltime&limit=25`
- `GET /leaderboard/me` — auth; full stats + streak + today's near-miss + prize estimate

Every endpoint that takes a tx signature enforces `tx_log.tx_signature UNIQUE` — replay attacks can't double-spend.

---

Ping me if anything's unclear. Otherwise, ship it.
