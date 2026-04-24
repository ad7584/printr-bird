// ============================================================
// PWA install banner.
//
// Shows a subtle "Install" pill when the browser fires
// `beforeinstallprompt` (Chrome/Edge/Android). On iOS Safari, which
// doesn't fire that event, we show a one-time "Add to Home Screen"
// hint instead. Dismissals persist in localStorage so we don't nag.
// ============================================================
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pb_install_dismissed';

function isIos() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const safari = /^((?!chrome|crios|fxios|android).)*safari/i.test(ua);
  return iOS && safari;
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator).standalone === true
  );
}

export default function PWAInstallBanner() {
  const [deferred, setDeferred] = useState(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(
    typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY) === '1',
  );

  useEffect(() => {
    if (dismissed) return;
    if (isStandalone()) return;

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // iOS fallback — show the "Share → Add to Home Screen" hint
    if (isIos() && !isStandalone()) {
      // Wait 10s before hinting so we don't interrupt initial interaction
      const t = setTimeout(() => setIosHint(true), 10_000);
      return () => { clearTimeout(t); window.removeEventListener('beforeinstallprompt', onPrompt); };
    }

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [dismissed]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
    setDeferred(null);
    setIosHint(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted' || outcome === 'dismissed') dismiss();
  };

  if (dismissed) return null;

  if (deferred) {
    return (
      <div className="pwa-banner">
        <span className="pwa-banner-label">Install Printr Bird</span>
        <button className="pwa-banner-cta" onClick={install}>Install</button>
        <button className="pwa-banner-close" aria-label="dismiss" onClick={dismiss}>×</button>
      </div>
    );
  }

  if (iosHint) {
    return (
      <div className="pwa-banner pwa-banner-ios">
        <span className="pwa-banner-label">
          Add to Home Screen: tap <strong>⇪</strong> then <strong>Add</strong>
        </span>
        <button className="pwa-banner-close" aria-label="dismiss" onClick={dismiss}>×</button>
      </div>
    );
  }

  return null;
}
