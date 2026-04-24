// ============================================================
// BridgeSync — invisible React component. Reads Privy hook state
// every render and writes it into AuthBridge so non-React code
// (GameAPI, Phaser scenes) can access it.
//
// This is the ONLY place allowed to call Privy hooks.
// ============================================================
import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useSolanaWallets, useSendTransaction } from '@privy-io/react-auth/solana';
import { Connection } from '@solana/web3.js';
import { AuthBridge } from '../auth/AuthBridge.js';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SOLANA_CLUSTER = import.meta.env.VITE_SOLANA_CLUSTER || 'mainnet-beta';

export default function BridgeSync() {
  const { ready, authenticated, user, getAccessToken, login, logout, fundWallet } = usePrivy();
  const { wallets } = useSolanaWallets();
  const { sendTransaction } = useSendTransaction();

  // Mirror static-ish config once
  useEffect(() => {
    AuthBridge._setSolana(SOLANA_CLUSTER, SOLANA_RPC_URL);
  }, []);

  // Mirror auth + wallet
  useEffect(() => {
    AuthBridge._setReady(ready);
    if (!ready) return;
    const wallet = wallets?.[0];
    AuthBridge._setAuth(authenticated, wallet?.address ?? null);
  }, [ready, authenticated, wallets]);

  // Register action handlers exactly once per mount.
  // We intentionally do NOT depend on getAccessToken/sendTransaction identity
  // so consumers get a stable bridge across React re-renders.
  useEffect(() => {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

    AuthBridge._setHandlers({
      getAccessToken: async () => getAccessToken(),
      login: () => login(),
      logout: () => logout(),
      openWalletFunding: () => {
        const wallet = wallets?.[0];
        if (!wallet) return;
        fundWallet(wallet.address, { chain: { type: 'solana', cluster: SOLANA_CLUSTER } });
      },
      signAndSend: async (tx) => {
        const wallet = wallets?.[0];
        if (!wallet) throw new Error('no solana wallet available');
        const { signature } = await sendTransaction({
          transaction: tx,
          connection,
          address: wallet.address,
        });
        return signature;
      },
    });
  });

  return null;
}
