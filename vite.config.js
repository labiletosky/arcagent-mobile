import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['util', 'stream', 'buffer', 'process', 'events'],
      globals: { Buffer: true, process: true }
    })
  ],
  optimizeDeps: {
    include: ['@circle-fin/w3s-pw-web-sdk']
  }
})