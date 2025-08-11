import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Import weather tiles plugin
import weatherTilesPlugin from './vite-plugins/weather-tiles'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    weatherTilesPlugin()
  ],
  base: '/geo-website/', // GitHub Pages base URL
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})