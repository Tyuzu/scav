import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    minify: 'terser',
    // Warn on chunks larger than 400KB (production size)
    chunkSizeWarningLimit: 400,
    
    // Enable source maps for production debugging (can be disabled to reduce artifact size)
    sourcemap: process.env.ENABLE_SOURCEMAPS ? 'hidden' : false,
    
    outDir: 'dist',
    
    rollupOptions: {
      output: {
        // Split chunks for better caching and parallelization
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules/hls.js')) return 'vendor-hls';
          if (id.includes('node_modules/uuid')) return 'vendor-uuid';
          
          // Feature chunks (split by route/feature)
          if (id.includes('/js/routes/')) return 'chunk-routes';
          if (id.includes('/js/services/')) return 'chunk-services';
          if (id.includes('/js/components/')) return 'chunk-components';
          if (id.includes('/js/api/')) return 'chunk-api';
          if (id.includes('/js/state/')) return 'chunk-state';
        },
        
        // Further optimize dynamic imports
        chunkFileNames: 'js/chunks/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|gif|svg/.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff|woff2|ttf|otf|eot/.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          } else if (ext === 'css') {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
      
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
  },
  
  server: {
    allowedHosts: ['.trycloudflare.com', 'localhost'],
  },
  
  // Define environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    __PROD__: JSON.stringify(process.env.NODE_ENV === 'production'),
  },
});
