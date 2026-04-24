import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

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
    nodePolyfills({
      include: ['buffer', 'process', 'crypto', 'stream', 'util'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
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
          { src: '/icons/icon-192.png',     sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png',     sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/meta/, /^\/session/, /^\/entitlement/, /^\/score/, /^\/leaderboard/],
        runtimeCaching: [
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
        ],
      },
      devOptions: {
        enabled: false,
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
    // Pre-bundle the heavy libs we actually use directly.
    include: ['@solana/web3.js', '@solana/spl-token', '@privy-io/react-auth', 'phaser'],
    // Exclude the @solana-program/* transitive chain so the solanaKitRedirect
    // plugin above can redirect their "@solana/web3.js" imports at resolve time
    // (optimizeDeps runs first and would otherwise hit the incompatible imports).
    exclude: [
      '@solana-program/system',
      '@solana-program/token',
      '@solana/kit',
    ],
  },
});