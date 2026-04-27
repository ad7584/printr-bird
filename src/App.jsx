// ============================================================
// App root — Privy provider + top-level layout.
//
// Flow:
//   not logged in     → LoginGate
//   logged in, home   → HomeScreen
//   logged in, playing → Phaser GameShell
// ============================================================
import { useState, useEffect } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import LoginGate from './react/LoginGate.jsx';
import GameShell from './react/GameShell.jsx';
import HomeScreen from './react/HomeScreen.jsx';
import BridgeSync from './react/BridgeSync.jsx';
import BrandFooter from './react/BrandFooter.jsx';
import PWAInstallBanner from './react/PWAInstallBanner.jsx';
import { AuthBridge } from './auth/AuthBridge.js';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID;
const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOLANA_CLUSTER = import.meta.env.VITE_SOLANA_CLUSTER || 'mainnet-beta';

export default function App() {
  if (!PRIVY_APP_ID) {
    return (
      <div className="missing-env">
        <h1>Missing <code>VITE_PRIVY_APP_ID</code></h1>
        <p>Set it in <code>.env</code> and restart <code>npm run dev</code>.</p>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // ----- Solana-only Privy app -----
        // 1. UI filter (appearance.walletChainType) hides every non-Solana
        //    wallet option from the connect modal.
        // 2. embeddedWallets explicitly enables Solana and disables Ethereum
        //    so an email/social signup does NOT auto-provision an EVM wallet
        //    alongside the Solana one.
        // 3. externalWallets only registers Solana connectors (Phantom,
        //    Solflare, Backpack, etc.) — no MetaMask / WalletConnect EVM.
        appearance: {
          theme: 'dark',
          accentColor: '#FF1E8E',
          logo: undefined,
          showWalletLoginFirst: false,
          walletChainType: 'solana-only',
        },
        loginMethods: ['email', 'google', 'twitter', 'wallet'],
        embeddedWallets: {
          solana: { createOnLogin: 'users-without-wallets' },
          ethereum: { createOnLogin: 'off' },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        solanaClusters: [
          { name: SOLANA_CLUSTER, rpcUrl: SOLANA_RPC_URL },
        ],
      }}
    >
      <BridgeSync />
      <AppShell />
      <BrandFooter />
      <PWAInstallBanner />
    </PrivyProvider>
  );
}

// ============================================================
// AppShell — picks which screen to render based on auth + route
// ============================================================
function AppShell() {
  const [snap, setSnap] = useState(AuthBridge.getSnapshot());
  const [view, setView] = useState('home'); // 'home' | 'game'
  const [bestScore, setBestScore] = useState(() => {
    try { return parseInt(localStorage.getItem('pb_best_score') || '0', 10); }
    catch { return 0; }
  });

  useEffect(() => AuthBridge.subscribe(setSnap), []);

  // Listen for Phaser → React signal "user finished, take me back home"
  useEffect(() => {
    const onReturnHome = (e) => {
      const score = e?.detail?.bestScore;
      if (typeof score === 'number') {
        setBestScore((prev) => {
          const next = Math.max(prev, score);
          try { localStorage.setItem('pb_best_score', String(next)); } catch {}
          return next;
        });
      }
      setView('home');
    };
    window.addEventListener('printr:return-home', onReturnHome);
    return () => window.removeEventListener('printr:return-home', onReturnHome);
  }, []);

  const handleStartGame = () => setView('game');

  // Not logged in → LoginGate (Phaser/Home both hidden)
  if (!snap.authenticated) {
    return (
      <div id="gameWrap">
        <LoginGate />
      </div>
    );
  }

  // Logged in + home view → HomeScreen
  if (view === 'home') {
    return (
      <div id="gameWrap" className="gameWrap-home">
        <HomeScreen onStartGame={handleStartGame} bestScore={bestScore} />
      </div>
    );
  }

  // Logged in + game view → Phaser
  return (
    <div id="gameWrap">
      <GameShell />
    </div>
  );
}