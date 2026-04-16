import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    minify: 'terser',
    chunkSizeWarningLimit: 1000,
    outDir: 'dist',
  },
  server: {
    // proxy: {
    //   // Proxy /api/v1/* → http://localhost:4000/api/v1/*
    // }
    allowedHosts: ['.trycloudflare.com'] 
  },
  rollupOptions: {
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false
    }
  },
});
