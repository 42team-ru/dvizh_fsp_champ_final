import { defineConfig } from 'orval'

// Контракт: openapi.json (лежит в репозитории, обновляется `yarn api:pull` с запущенного бэка).
// Генерация: `yarn api:gen` -> src/api/generated (тоже коммитится, чтобы фронт собирался без бэка).
export default defineConfig({
  api: {
    input: { target: './openapi.json' },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      schemas: './src/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      baseUrl: '', // относительные пути: /api/* в деве проксирует Vite, в проде Caddy
      clean: true,
    },
  },
})
