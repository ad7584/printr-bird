import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  define: {
    // @solana/web3.js leaks a couple of Node-flavored globals in some paths
    'process.env.NODE_DEBUG': 'undefined',
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@solana/web3.js', '@solana/spl-token', '@privy-io/react-auth', 'phaser'],
  },
});
