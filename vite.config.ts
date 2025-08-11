import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import createWeatherTilesPlugin from './vite-plugins/weather-tiles'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    createWeatherTilesPlugin()
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  optimizeDeps: {
    include: ['maplibre-gl', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/mapbox', 'suncalc']
  }
})
