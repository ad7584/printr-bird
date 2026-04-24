// ============================================================
// GameShell — owns the DOM node Phaser mounts into.
// Phaser is initialized exactly once per page load, on first
// authenticated render. We do NOT tear it down on logout —
// the game state is in-memory and cheap to leave alive.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { AuthBridge } from '../auth/AuthBridge.js';
import { bootPhaser } from '../phaser/bootstrap.js';
import WalletBadge from './WalletBadge.jsx';

export default function GameShell() {
  const containerRef = useRef(null);
  const bootedRef = useRef(false);
  const [snap, setSnap] = useState(AuthBridge.getSnapshot());

  useEffect(() => AuthBridge.subscribe(setSnap), []);

  useEffect(() => {
    if (bootedRef.current) return;
    if (!snap.authenticated) return;
    if (!containerRef.current) return;
    bootedRef.current = true;
    bootPhaser(containerRef.current);
  }, [snap.authenticated]);

  return (
    <>
      <div id="game" ref={containerRef} />
      {snap.authenticated ? <WalletBadge /> : null}
    </>
  );
}
