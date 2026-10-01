// Скачивает OpenAPI-спеку с бэка в openapi.json (форматированную, чтобы в git были читаемые диффы).
//   yarn api:pull                                  -> http://localhost:8080/v3/api-docs
//   API_URL=https://my.vps yarn api:pull           -> любой другой хост
//   API_SPEC_URL=http://x/custom/docs yarn api:pull -> полный путь до спеки
import { writeFileSync } from 'node:fs'

const url = process.env.API_SPEC_URL ?? `${process.env.API_URL ?? 'http://localhost:8080'}/v3/api-docs`
const res = await fetch(url)
if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}. Бэк запущен?`)
writeFileSync('openapi.json', JSON.stringify(await res.json(), null, 2) + '\n')
console.log(`openapi.json обновлён из ${url}`)
