// ============================================================
// LoginGate — full-screen overlay shown until user signs in.
// The Phaser canvas is rendered underneath; we fade the gate out
// on authenticated so Phaser becomes interactive.
// ============================================================
import { useEffect, useState } from 'react';
import { AuthBridge } from '../auth/AuthBridge.js';

export default function LoginGate() {
  const [snap, setSnap] = useState(AuthBridge.getSnapshot());
  useEffect(() => AuthBridge.subscribe(setSnap), []);

  if (!snap.ready) {
    return (
      <div className="gate gate-loading">
        <div className="gate-title">PRINTR <span className="accent">BIRD</span></div>
        <div className="gate-sub">loading…</div>
      </div>
    );
  }

  if (snap.authenticated) return null;

  return (
    <div className="gate">
      <div className="gate-inner">
        <div className="gate-title">
          PRINTR <span className="accent">BIRD</span>
        </div>
        <div className="gate-tag">FLY . PRINT . REPEAT</div>
        <p className="gate-copy">
          Compete for SOL prizes. First play's on the house.
        </p>
        <button className="gate-btn" onClick={() => AuthBridge.login()}>
          SIGN IN TO PLAY
        </button>
        <div className="gate-fineprint">
          email · google · X · phantom
        </div>
      </div>
    </div>
  );
}
