import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';

  return {
    root: '.',

    build: {
      outDir: 'dist',
      minify: 'terser',
      chunkSizeWarningLimit: 400,
      assetsInlineLimit: 4096,

      terserOptions: {
        compress: {
          drop_console: isProd,
        },
      },

      sourcemap: env.ENABLE_SOURCEMAPS ? 'hidden' : false,

      rollupOptions: {
        output: {
          manualChunks(id) {
            // -----------------------
            // CSS splitting
            // -----------------------
            if (id.endsWith('.css')) {
              if (id.includes('ui')) {
                return 'styles-ui';
              }
              if (id.match(/form/i)) {
                return 'styles-forms';
              }
              if (id.match(/nav|header|footer|sidebar/i)) {
                return 'styles-layout';
              }
              if (id.match(/profile|user/i)) {
                return 'styles-profile';
              }
              return 'styles';
            }

            // -----------------------
            // Vendor splitting
            // -----------------------
            if (id.includes('node_modules')) {
              if (id.includes('hls.js')) {
                return 'vendor-hls';

              }
              if (id.includes('uuid')) {
                return 'vendor-uuid';

              }
              return 'vendor';
            }

            // -----------------------
            // Route-level splitting (best ROI)
            // -----------------------
            if (id.includes('/js/routes/')) {
              return 'routes';
            }

            // -----------------------
            // Core app layers
            // -----------------------
            if (id.includes('/js/api/')) {
              return 'api';
            }
            if (id.includes('/js/state/')) {
              return 'state';
            }

            // -----------------------
            // Services (grouped, not over-split)
            // -----------------------
            if (id.includes('/js/services/')) {
              if (id.match(/auth|user|profile/)) {
                return 'services-auth';
              }
              if (id.match(/api|http|request/)) {
                return 'services-api';
              }
              if (id.match(/socket|message|notification|chat/i)) {
                return 'services-realtime';
              }
              if (id.match(/media|upload|image/)) {
                return 'services-media';
              }
              return 'services';
            }

            // -----------------------
            // Components (simplified)
            // -----------------------
            if (id.includes('/js/components/')) {
              if (id.includes('ui/')) {
                return 'components-ui';
              }
              if (id.match(/nav|header|sidebar/i)) {
                return 'components-layout';
              }
              return 'components';
            }
          },

          chunkFileNames: 'js/chunks/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',

          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || '';
            const ext = name.split('.').pop();

            if (/png|jpe?g|gif|svg/.test(ext)) {
              return `assets/images/[name]-[hash][extname]`;
            }

            if (/woff2?|ttf|otf|eot/.test(ext)) {
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

    server: {
      allowedHosts: ['.trycloudflare.com', 'localhost'],
    },

    define: {
      __DEV__: JSON.stringify(!isProd),
      __PROD__: JSON.stringify(isProd),
    },
  };
});