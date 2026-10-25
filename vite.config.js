import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // SW сам обновляет прекэш при новом деплое и перезагружает страницу один раз.
      // skipWaiting / clientsClaim ставит сам плагин — вручную не добавляем.
      registerType: 'autoUpdate',
      // Ассеты, которые попадают в прекэш помимо сгенерированных (js/css/html).
      includeAssets: ['favicon.ico', 'favicon-96x96.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Расписание ЮФУ',
        short_name: 'Расписание',
        description: 'Электронное расписание группы ПИ-17 ЮФУ',
        lang: 'ru',
        // Репозиторий <user>.github.io — деплой в корень, поэтому start_url/scope = '/'.
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#161616',
        theme_color: '#161616',
        icons: [
          { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        globIgnores: ['**/sw.js'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Google Sheets CSV (cross-origin) — онлайн свежее, офлайн последний удачный.
            urlPattern: /^https:\/\/docs\.google\.com\/spreadsheets\/.*\?.*output=csv/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'schedule-csv-v1',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 14 },
              cacheableResponse: { statuses: [0, 200] },
              // При офлайне запрос встаёт в очередь и «догоняет» свежий CSV при
              // появлении сети. Работает на Android/desktop; на iOS Safari sync-событие
              // не стреляет — записи просто лежат в IndexedDB (без вреда).
              backgroundSync: {
                name: 'schedule-csv-sync',
                options: { maxRetentionTime: 60 * 24 }, // минуты = 1 день
              },
            },
          },
        ],
      },
      showMaximumFileSizeToCacheInBytesWarning: true,
    }),
  ],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // правило проекта: импорты через @/*
    },
  },
  server: {
    host: '0.0.0.0', // доступ с других устройств по локальной сети
  },
  test: {
    environment: 'node',
  },
})