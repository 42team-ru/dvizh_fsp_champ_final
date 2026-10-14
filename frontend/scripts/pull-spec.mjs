// Скачивает OpenAPI-спеку с бэка в src/shared/api/schemas/openapi.json (форматированную, чтобы в git были читаемые диффы).
//   yarn api:pull                                   -> ${VITE_BACKEND_URL}/v3/api-docs (из .env или http://localhost:8080)
//   API_SPEC_URL=http://x/custom/docs yarn api:pull -> полный путь до спеки
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

try {
  process.loadEnvFile('.env')
} catch {
  // .env нет — используем переменные окружения и значения по умолчанию
}

const OUTPUT = 'src/shared/api/schemas/openapi.json'
const backend = (process.env.VITE_BACKEND_URL || 'http://localhost:8080').replace(/\/+$/, '')
const url = process.env.API_SPEC_URL ?? `${backend}/v3/api-docs`

const res = await fetch(url)
if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}. Бэк запущен?`)

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, JSON.stringify(await res.json(), null, 2) + '\n')
console.log(`${OUTPUT} обновлён из ${url}`)
