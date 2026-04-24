// ============================================================
// App root — Privy provider + top-level layout.
// ============================================================
import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import LoginGate from './react/LoginGate.jsx';
import GameShell from './react/GameShell.jsx';
import BridgeSync from './react/BridgeSync.jsx';
import BrandFooter from './react/BrandFooter.jsx';

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
      <div id="gameWrap">
        <GameShell />
        <LoginGate />
        <BrandFooter />
      </div>
    </PrivyProvider>
  );
}
