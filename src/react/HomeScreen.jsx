// ============================================================
// HomeScreen — React landing screen shown after login.
// Replaces the Phaser MenuScene as the primary navigation point.
//
// Sections:
//   - Hero (logo, tagline)
//   - Token card (name, ticker, CA, copy)
//   - Leaderboard countdown (live ticker)
//   - Primary CTAs: Start Game, High Score
//   - Wallet panel (address, balance, export key)
// ============================================================
import { useEffect, useState, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets } from '@privy-io/react-auth/solana';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// ============================================================
// EDIT HERE: Launch date for the leaderboard countdown.
// Set this to the actual date you want leaderboard to start.
// Format: ISO 8601 string with timezone (UTC recommended).
// Example: '2026-04-30T18:00:00Z' = April 30, 2026 at 6pm UTC.
// ============================================================
const LAUNCH_DATE = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

// ============================================================
// EDIT HERE: Token contract address.
// Replace this when $BIRD launches on Printr launchpad.
// ============================================================
const BIRD_CA = 'TBA — drops on Printr launchpad soon';

const SOLANA_RPC_URL =
  import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

export default function HomeScreen({ onStartGame, bestScore = 0 }) {
  const { user, exportWallet, ready } = usePrivy();
  const { wallets } = useSolanaWallets();
  const wallet = wallets?.[0];
  const address = wallet?.address;

  const [solBalance, setSolBalance] = useState(null);
  const [copied, setCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [timer, setTimer] = useState(getTimerParts(LAUNCH_DATE));

  // Live countdown — tick every second
  useEffect(() => {
    const id = setInterval(() => setTimer(getTimerParts(LAUNCH_DATE)), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch SOL balance once we have a wallet
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    (async () => {
      try {
        const conn = new Connection(SOLANA_RPC_URL, 'confirmed');
        const lamports = await conn.getBalance(new PublicKey(address));
        if (!cancelled) setSolBalance(lamports / LAMPORTS_PER_SOL);
      } catch (err) {
        console.warn('[HomeScreen] balance fetch failed', err);
      }
    })();
    return () => { cancelled = true; };
  }, [address]);

  const copyCA = useCallback(() => {
    navigator.clipboard.writeText(BIRD_CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const copyAddress = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 1500);
  }, [address]);

  const handleExport = useCallback(async () => {
    try {
      await exportWallet();
    } catch (err) {
      console.error('[HomeScreen] export failed', err);
    }
  }, [exportWallet]);

  const truncatedAddress = address
    ? `${address.slice(0, 4)}…${address.slice(-4)}`
    : '—';

  return (
    <div className="home">
      {/* Top bar — wallet info + export */}
      <div className="home-topbar">
        <div className="home-wallet-info">
          <span className="home-wallet-label">WALLET</span>
          <button
            className="home-wallet-pill"
            onClick={copyAddress}
            disabled={!address}
            title={address ?? ''}
          >
            {addressCopied ? '✓ COPIED' : truncatedAddress}
          </button>
          <span className="home-balance">
            {solBalance === null ? '…' : `${solBalance.toFixed(4)} SOL`}
          </span>
        </div>
        <button
          className="home-export"
          onClick={handleExport}
          title="Export private key"
        >
          🔑 EXPORT KEY
        </button>
      </div>

      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-logos">
          <div className="home-hero-bird" aria-label="Printr Bird mascot" />
        </div>
        <h1 className="home-title">
          PRINTR <span className="home-title-accent">BIRD</span>
        </h1>
        <p className="home-tagline">FLY · PRINT · REPEAT</p>
        <p className="home-blurb">
          The official mascot of the Printr ecosystem.<br />
          Fly through chaos. Stack scores. Win SOL.
        </p>
      </div>

      {/* Countdown */}
      <div className="home-card home-countdown">
        <div className="home-card-label">LEADERBOARD STARTS IN</div>
        <div className="home-timer">
          <TimeChunk value={timer.days} label="DAYS" />
          <span className="home-timer-sep">:</span>
          <TimeChunk value={timer.hours} label="HRS" />
          <span className="home-timer-sep">:</span>
          <TimeChunk value={timer.mins} label="MIN" />
          <span className="home-timer-sep">:</span>
          <TimeChunk value={timer.secs} label="SEC" />
        </div>
        <div className="home-countdown-note">
          {timer.expired
            ? '🔥 LEADERBOARD IS LIVE'
            : 'Practice now. Compete for SOL when timer hits zero.'}
        </div>
      </div>

      {/* Token card */}
      <div className="home-card home-token">
        <div className="home-token-head">
          <div className="home-token-logo" aria-label="$BIRD token logo" />
          <div className="home-token-meta">
            <div className="home-token-name">$BIRD</div>
            <div className="home-token-sub">Printr Bird Token</div>
          </div>
        </div>
        <div className="home-token-ca">
          <span className="home-token-ca-label">CONTRACT</span>
          <span className="home-token-ca-value">{BIRD_CA}</span>
        </div>
        <button className="home-token-buy" onClick={copyCA}>
          {copied ? '✓ COPIED' : '📋 COPY CA'}
        </button>
        <div className="home-token-fineprint">
          Holders get free plays + revives. Top players earn SOL.
        </div>
      </div>

      {/* Primary CTAs */}
      <div className="home-cta-row">
        <button className="home-cta-primary" onClick={onStartGame}>
          <span className="home-cta-label">START GAME</span>
          <span className="home-cta-sub">tap · space · ↑ to flap</span>
        </button>
        <div className="home-best">
          <div className="home-best-label">YOUR HIGH SCORE</div>
          <div className="home-best-value">{bestScore}</div>
        </div>
      </div>

      {/* Footer info row */}
      <div className="home-info-row">
        <InfoBadge title="BUILT ON PRINTR" emoji="P" />
        <InfoBadge title="FAST & FEARLESS" emoji="⚡" />
        <InfoBadge title="MADE FOR DEGENS" emoji="🎮" />
      </div>
    </div>
  );
}

// ---- helpers ----

function TimeChunk({ value, label }) {
  return (
    <div className="home-timer-chunk">
      <div className="home-timer-num">{String(value).padStart(2, '0')}</div>
      <div className="home-timer-label">{label}</div>
    </div>
  );
}

function InfoBadge({ title, emoji }) {
  return (
    <div className="home-info-badge">
      <div className="home-info-emoji">{emoji}</div>
      <div className="home-info-title">{title}</div>
    </div>
  );
}

function getTimerParts(launchIso) {
  const now = Date.now();
  const launch = new Date(launchIso).getTime();
  const diff = launch - now;
  if (diff <= 0) {
    return { days: 0, hours: 0, mins: 0, secs: 0, expired: true };
  }
  const totalSecs = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    mins: Math.floor((totalSecs % 3600) / 60),
    secs: totalSecs % 60,
    expired: false,
  };
}