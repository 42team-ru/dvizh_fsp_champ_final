#!/usr/bin/env node
// Разработка одной командой: Postgres (docker, порт 5440) + бэкенд (8080) + фронт (5173).
//   node scripts/dev.mjs     (или make dev)
// Ctrl+C останавливает бэкенд и фронт; БД остаётся в Docker (остановить: make dev-down).
// Кроссплатформенно (Windows, macOS, Linux).
import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import net from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const win = process.platform === 'win32'
const PORTS = { 'БД (docker)': 5440, 'бэкенд': 8080, 'фронт': 5173 }

const free = (port) =>
  new Promise((resolve) => {
    const s = net.createServer()
    s.once('error', () => resolve(false))
    s.once('listening', () => s.close(() => resolve(true)))
    s.listen(port, '127.0.0.1')
  })

// Порты проверяем до старта; свой же контейнер БД на 5440 — не ошибка
const dbRunning =
  spawnSync('docker', ['compose', '-f', 'docker-compose.dev.yml', 'ps', '-q', 'db'], { cwd: root, encoding: 'utf8' }).stdout?.trim() !== ''
for (const [name, port] of Object.entries(PORTS)) {
  if (name.startsWith('БД') && dbRunning) continue
  if (!(await free(port))) {
    console.error(`✖ Порт ${port} (${name}) уже занят. Освободите его и повторите.`)
    process.exit(1)
  }
}

console.log('▶ Postgres...')
const db = spawnSync('docker', ['compose', '-f', 'docker-compose.dev.yml', 'up', '-d', '--wait'], { cwd: root, stdio: 'inherit' })
if (db.status !== 0) {
  console.error('✖ Не удалось поднять БД. Запущен ли Docker?')
  process.exit(1)
}

if (!existsSync(join(root, 'frontend', 'node_modules'))) {
  console.log('▶ yarn install (первый запуск)...')
  const i = spawnSync('yarn', ['install', '--frozen-lockfile'], { cwd: join(root, 'frontend'), stdio: 'inherit', shell: win })
  if (i.status !== 0) process.exit(1)
}

const children = []
const color = { back: '\x1b[36m', front: '\x1b[35m' }

function run(tag, cmd, args, cwd, env = {}) {
  const child = spawn(cmd, args, { cwd, shell: win, detached: !win, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } })
  const out = (stream) => {
    let buf = ''
    stream.on('data', (d) => {
      buf += d
      const lines = buf.split(/\r?\n/)
      buf = lines.pop() ?? ''
      for (const l of lines) console.log(`${color[tag]}[${tag}]\x1b[0m ${l}`)
    })
  }
  out(child.stdout)
  out(child.stderr)
  child.on('exit', (code) => {
    console.log(`${color[tag]}[${tag}]\x1b[0m завершился (код ${code})`)
    stop(code ?? 0)
  })
  children.push(child)
}

let stopping = false
function stop(code = 0) {
  if (stopping) return
  stopping = true
  for (const c of children) {
    try {
      if (win) spawnSync('taskkill', ['/pid', String(c.pid), '/T', '/F'], { stdio: 'ignore' })
      else process.kill(-c.pid, 'SIGTERM')
    } catch {
      /* уже завершён */
    }
  }
  setTimeout(() => process.exit(code), 500)
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

run('back', win ? 'gradlew.bat' : './gradlew', ['bootRun', '--console=plain'], join(root, 'backend'))
// Пустой VITE_BACKEND_URL: фронт ходит на свой же адрес, /api проксирует Vite (как Caddy в проде, без CORS)
run('front', 'yarn', ['dev'], join(root, 'frontend'), { VITE_BACKEND_URL: '' })

console.log('\n  бэкенд  http://localhost:8080   (swagger: /swagger-ui.html)')
console.log('  фронт   http://localhost:5173')
console.log('  БД      localhost:5440  (app / app / app)')
console.log('  Ctrl+C — остановить бэкенд и фронт\n')
