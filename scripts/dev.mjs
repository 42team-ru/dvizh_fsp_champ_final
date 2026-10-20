#!/usr/bin/env node
// Разработка: БД, бэкенд и фронт запускаются ОТДЕЛЬНО, чтобы каждый можно было быстро перезапустить.
//   node scripts/dev.mjs          (make dev)    — Postgres (5440) и MinIO/S3 (9440, консоль 9441) в Docker, один раз; остаются работать
//   node scripts/dev.mjs back     (make back)   — бэкенд :8080, свой терминал
//   node scripts/dev.mjs front    (make front)  — фронт :5173, свой терминал
// Ctrl+C останавливает только то, что запущено в этом терминале. Кроссплатформенно (Windows, macOS, Linux).
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const win = process.platform === 'win32'
const mode = process.argv[2] ?? 'db'

const isOpen = (port) =>
  new Promise((resolve) => {
    const s = net.connect({ port, host: '127.0.0.1' })
    s.once('connect', () => (s.destroy(), resolve(true)))
    s.once('error', () => resolve(false))
  })

const die = (msg) => (console.error('✖ ' + msg), process.exit(1))

async function ensurePortFree(port, what) {
  if (await isOpen(port)) die(`Порт ${port} (${what}) уже занят. Возможно, он уже запущен в другом терминале.`)
}

// Запуск в этом терминале; Ctrl+C уходит напрямую дочернему процессу
function runHere(cmd, args, cwd, env = {}) {
  const child = spawn(cmd, args, { cwd, shell: win, stdio: 'inherit', env: { ...process.env, ...env } })
  process.on('SIGINT', () => {})
  process.on('SIGTERM', () => child.kill('SIGTERM'))
  child.on('exit', (code) => process.exit(code ?? 0))
}

if (mode === 'db') {
  console.log('▶ Postgres (порт 5440) и MinIO (порт 9440) в Docker...')
  const r = spawnSync('docker', ['compose', '-f', 'docker-compose.dev.yml', 'up', '-d', '--wait'], { cwd: root, stdio: 'inherit' })
  if (r.status !== 0) die('Не удалось поднять БД и S3. Запущен ли Docker?')
  console.log(`
✔ БД готова: localhost:5440 (app / app / app)
✔ S3 готов:  http://localhost:9440, бакет app-files создаст бэкенд
   консоль MinIO: http://localhost:9441 (app / app-secret-dev)
Они остаются работать, остановить: make dev-down

Дальше в ОТДЕЛЬНЫХ терминалах (каждый перезапускается сам по себе):
  make back     бэкенд  http://localhost:8080   (swagger: /swagger-ui.html)
  make front    фронт   http://localhost:5173
Бэкенд можно запускать и из IDE (класс TestAppApplication или AppApplication).`)
} else if (mode === 'back') {
  if (!(await isOpen(5440))) die('БД не запущена. Сначала выполните: make dev')
  if (!(await isOpen(9440))) die('S3 (MinIO) не запущен. Выполните: make dev (поднимет недостающее)')
  await ensurePortFree(8080, 'бэкенд')
  // Ключ 2ГИС из корневого .env: бэк считает маршруты для подсказки «когда выходить» (без ключа — оценка)
  const dotenv = existsSync(join(root, '.env')) ? readFileSync(join(root, '.env'), 'utf8') : ''
  const fromEnv = (name) => dotenv.match(new RegExp(`^${name}=["']?([^"'\r\n]*)`, 'm'))?.[1] ?? ''
  const key = fromEnv('VITE_2GIS_KEY')
  // Нейросеть модерации (make llm) из корневого .env: MODERATION_LLM_ENABLED=true
  const llm = fromEnv('MODERATION_LLM_ENABLED')
  runHere(win ? 'gradlew.bat' : './gradlew', ['bootRun', '--console=plain'], join(root, 'backend'), {
    ...(key && !process.env.VITE_2GIS_KEY ? { VITE_2GIS_KEY: key } : {}),
    ...(llm && !process.env.MODERATION_LLM_ENABLED ? { MODERATION_LLM_ENABLED: llm } : {}),
  })
} else if (mode === 'front') {
  await ensurePortFree(5173, 'фронт')
  const frontend = join(root, 'frontend')
  if (!existsSync(join(frontend, 'node_modules'))) {
    console.log('▶ yarn install (первый запуск)...')
    if (spawnSync('yarn', ['install', '--frozen-lockfile'], { cwd: frontend, stdio: 'inherit', shell: win }).status !== 0) process.exit(1)
  }
  // Пустой VITE_BACKEND_URL: фронт ходит на свой же адрес, /api проксирует Vite (как Caddy в проде, без CORS)
  runHere('yarn', ['dev'], frontend, { VITE_BACKEND_URL: '' })
} else {
  die(`Неизвестный режим "${mode}". Доступно: db (по умолчанию), back, front`)
}
