// ============================================================
// API router — exports whichever implementation is enabled.
// Toggle via VITE_USE_MOCK_API in .env
// ============================================================

import { GameAPI as RealGameAPI } from './GameAPI.js';
import { MockGameAPI } from './MockGameAPI.js';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';

if (USE_MOCK) {
  // eslint-disable-next-line no-console
  console.warn(
    '%c[Printr Bird] MOCK API MODE',
    'background:#FF1E8E;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold',
    '— no real payments or backend calls. Flip VITE_USE_MOCK_API=false for production.'
  );
}

export const GameAPI = USE_MOCK ? MockGameAPI : RealGameAPI;