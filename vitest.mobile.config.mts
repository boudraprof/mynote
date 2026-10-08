import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./mobile-app/src/', import.meta.url)) },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    root: fileURLToPath(new URL('./mobile-app', import.meta.url)),
    reporters: ['verbose'],
  },
})
