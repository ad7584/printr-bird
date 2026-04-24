import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// --------------------------------------------------------------------
// @solana/web3.js v2 was renamed to @solana/kit. The @solana-program/*
// packages (transitive deps of Privy's Solana module) still import from
// "@solana/web3.js" expecting the v2 API. We keep v1 as a direct dep
// for our own tx-building code, so we need to redirect ONLY the
// @solana-program/* imports to @solana/kit.
// --------------------------------------------------------------------
function solanaKitRedirect() {
  return {
    name: 'solana-kit-redirect',
    enforce: 'pre',
    async resolveId(source, importer) {
      if (
        source === '@solana/web3.js' &&
        importer &&
        /[\\/]@solana-program[\\/]/.test(importer)
      ) {
        return this.resolve('@solana/kit', importer, { skipSelf: true });
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    solanaKitRedirect(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Inject a tiny registration script + auto-update flow into index.html
      injectRegister: 'auto',
      includeAssets: [
        'favicon.svg',
        'robots.txt',
        'icons/apple-touch-icon-180.png',
      ],
      manifest: {
        name: 'Printr Bird',
        short_name: 'Printr Bird',
        description: 'Fly. Print. Repeat. Flappy-style game with SOL prizes.',
        theme_color: '#05020a',
        background_color: '#05020a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['games', 'entertainment'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache: all JS/CSS/font assets emitted by Vite build
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        // Main bundle is >4MB (Privy + Solana). Bump the threshold so it precaches.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/meta/, /^\/session/, /^\/entitlement/, /^\/score/, /^\/leaderboard/],
        runtimeCaching: [
          // Google Fonts — CacheFirst, long TTL
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Backend /meta/* — NetworkFirst so prices stay fresh, but we can
          // render something if the network blips during a session.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/meta/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'backend-meta',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // NEVER cache auth'd endpoints — intentionally fall through to network
          // (session, entitlement, score, leaderboard/me all need live state)
        ],
      },
      devOptions: {
        enabled: false,          // set true to test SW behavior in dev
        type: 'module',
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  define: {
    'process.env.NODE_DEBUG': 'undefined',
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@solana/web3.js', '@solana/spl-token', '@privy-io/react-auth', 'phaser'],
  },
});
