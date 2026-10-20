# Orval: клиент API для фронта

Схема OpenAPI лежит в git — `frontend/src/shared/api/schemas/openapi.json`. Orval генерирует из неё
клиент и хуки TanStack Query в `frontend/src/shared/api/generated/core` — тоже в git. Поэтому фронт и
Docker-сборка обходятся без бэкенда.

```text
бэкенд /v3/api-docs ──yarn api:pull──▶ openapi.json ──yarn orval──▶ generated/core
```

| Команда         | Что                                    |
|-----------------|----------------------------------------|
| `yarn api:pull` | скачать схему с бэкенда                |
| `yarn orval`    | сгенерировать клиент из `openapi.json` |
| `yarn api:sync` | оба шага                               |

**Поменяли API** → `make back` → `cd frontend && yarn api:sync` → закоммитить `openapi.json` и
`generated/`. JSON форматируется, диффы читаемые. При конфликте в этих файлах руками не мержить —
заново `yarn api:sync` на смерженном бэкенде.

Имена хуков берутся из `operationId`: `events_get` → `useEventsGet`. Данные во фронте получаются только
через эти хуки, axios руками не вызывается.

**Переменные** (`frontend/.env`):

| Переменная         | Что                                                                                 |
|--------------------|-------------------------------------------------------------------------------------|
| `VITE_BACKEND_URL` | адрес бэкенда: прокси `/api` в `yarn dev` и источник для `api:pull`                 |
| `API_SPEC_URL`     | необязательно: полный адрес схемы, если она не по `${VITE_BACKEND_URL}/v3/api-docs` |

**`api:pull` отвечает 404 или `fetch failed`** — бэкенд не запущен или неверный `VITE_BACKEND_URL`.
Откройте `<адрес>/v3/api-docs`: там должен быть JSON, а не HTML или ошибка входа.

**`null`, а не `undefined`.** В типах необязательные поля описаны как `endAt?: string`, а бэкенд присылает
`"endAt": null`. Проверять через `!= null` или `??`.
