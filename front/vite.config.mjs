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
        manualChunks: {
          // Vendor chunks
          'vendor-ui': ['hls.js'],
          'vendor-util': ['uuid'],
          
          // Feature chunks (split by route/feature)
          'routes': ['./js/routes'],
          'services': ['./js/services'],
          'components': ['./js/components'],
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
