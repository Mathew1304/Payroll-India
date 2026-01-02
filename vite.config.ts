import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Production build optimizations
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console statements in production builds
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Generate source maps for debugging (but console will still be stripped)
    sourcemap: false, // Set to true if you need source maps for production debugging
  },
});
