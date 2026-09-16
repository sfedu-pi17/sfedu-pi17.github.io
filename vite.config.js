import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'

// Хэш текущего коммита git — версия сборки. Инъектируется в код как __BUILD_HASH__
// и используется как версия кэша расписания в localStorage: при несовпадении версии
// кэш очищается. Fallback 'dev' — стабильное значение, если git недоступен.
function buildHash() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: '0.0.0.0', // доступ с других устройств по локальной сети
  },
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash()),
  },
  test: {
    environment: 'node',
  },
})
