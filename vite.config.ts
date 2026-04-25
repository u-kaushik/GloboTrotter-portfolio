import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.MIXPANEL_TOKEN': JSON.stringify(env.MIXPANEL_TOKEN),
      'process.env.GA_MEASUREMENT_ID': JSON.stringify(env.GA_MEASUREMENT_ID),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/.netlify/functions': {
          target: 'http://localhost:9999',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/\.netlify\/functions/, ''),
        },
      },
    },
  };
});
