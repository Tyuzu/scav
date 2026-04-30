import { defineConfig, loadEnv, splitVendorChunkPlugin } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import mkcert from 'vite-plugin-mkcert'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    root: '.',

    plugins: [
      mkcert(),
      splitVendorChunkPlugin(),
      isProd && visualizer({ open: true }),
    ].filter(Boolean),

    build: {
      outDir: 'dist',

      minify: isProd ? 'terser' : 'esbuild',
      chunkSizeWarningLimit: 400,
      assetsInlineLimit: 4096,
      cssCodeSplit: true,

      modulePreload: {
        polyfill: true,
      },

      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
          passes: 2,
        },
        mangle: {
          safari10: true,
        },
      },

      sourcemap: isProd
        ? (env.ENABLE_SOURCEMAPS ? 'hidden' : false)
        : true,

      rollupOptions: {
        output: {
          manualChunks(id) {
            const lower = id.toLowerCase();

            // -----------------------
            // Deterministic vendor splitting
            // -----------------------
            if (id.includes('node_modules')) {
              const parts = id.split('node_modules/')[1];
              if (parts) {
                const pkg = parts.split('/')[0];
                return `vendor-${pkg}`;
              }
              return 'vendor';
            }

            // -----------------------
            // Route-level splitting (high ROI)
            // -----------------------
            if (lower.includes('/js/routes/')) {
              return 'routes';
            }

            // Let Vite handle the rest to avoid over-splitting
          },

          experimentalMinChunkSize: 20000,

          chunkFileNames: 'js/chunks/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',

          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || '';
            const ext = name.split('.').pop()?.toLowerCase();

            if (ext && /png|jpe?g|gif|svg/.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }

            if (ext && /woff2?|ttf|otf|eot/.test(ext)) {
              return `assets/fonts/[name]-[hash][extname]`;
            }

            if (ext === 'css') {
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

    optimizeDeps: {
      include: ['uuid', 'hls.js'],
    },

    server: {
      allowedHosts: ['.trycloudflare.com', 'localhost'],
      https: true, // Required to enable the HTTPS server
      '/api/v1': {
        target: 'https://192.168.234.236:4000',
        //      changeOrigin: true,
        //      rewrite: (path) => path.replace(/^\/v1/, ''),
        secure: false, // Set to true if target uses valid SSL
      },
    },

    define: {
      __DEV__: JSON.stringify(!isProd),
      __PROD__: JSON.stringify(isProd),
    },
  };
});
