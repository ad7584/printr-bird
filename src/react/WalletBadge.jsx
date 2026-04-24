// ============================================================
// Small top-right badge showing the signed-in wallet + logout.
// Also exposes "Add funds" which opens Privy's fiat onramp.
// ============================================================
import { useEffect, useState } from 'react';
import { AuthBridge } from '../auth/AuthBridge.js';

export default function WalletBadge() {
  const [snap, setSnap] = useState(AuthBridge.getSnapshot());
  const [open, setOpen] = useState(false);
  useEffect(() => AuthBridge.subscribe(setSnap), []);

  const short = snap.walletAddress
    ? `${snap.walletAddress.slice(0, 4)}…${snap.walletAddress.slice(-4)}`
    : '—';

  return (
    <div className="wallet-badge">
      <button className="wallet-chip" onClick={() => setOpen((o) => !o)}>
        <span className="dot" /> {short}
      </button>
      {open ? (
        <div className="wallet-menu">
          <button onClick={() => { AuthBridge.openWalletFunding(); setOpen(false); }}>
            Add funds
          </button>
          <button onClick={() => { AuthBridge.logout(); setOpen(false); }}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
