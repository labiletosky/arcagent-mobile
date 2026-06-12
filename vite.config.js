import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['util', 'stream', 'buffer', 'process', 'events'],
      globals: { Buffer: true, process: true }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html')
      }
    }
  },
  optimizeDeps: {
    include: ['@circle-fin/w3s-pw-web-sdk']
  }
})