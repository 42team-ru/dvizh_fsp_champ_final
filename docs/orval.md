# Orval: генерация API-клиента

## Как это работает

OpenAPI-спека хранится в git: `src/shared/api/schemas/openapi.json`.
Orval генерирует клиент из этого файла в `src/shared/api/generated/core` (тоже в git).
Бэкенд для генерации и для Docker build **не нужен**.

```text
бэкенд /v3/api-docs --(yarn api:pull)--> openapi.json --(yarn orval)--> generated/core
```

## Команды

| Команда            | Что делает                                              |
| ------------------ | ------------------------------------------------------- |
| `yarn api:pull`    | Скачивает спеку с бэкенда в `openapi.json`              |
| `yarn orval`       | Генерирует клиент из `openapi.json`                     |
| `yarn api:sync`    | `api:pull` + `orval`                                    |
| `yarn local`       | `orval` + `react-router dev`                            |

## Когда обновлять API

Бэкенд изменил API → `yarn api:sync` → закоммитить изменения в `openapi.json` и `generated/`.
Диффы спеки читаемые (JSON форматируется скриптом).

## Переменные окружения

Файл `.env` (см. `.env.example`):

- `VITE_BACKEND_URL` — адрес бэкенда. Нужен для прокси `/api` в `vite dev` и для `yarn api:pull`.
- `API_SPEC_URL` — необязательно, полный URL спеки, если она не по `${VITE_BACKEND_URL}/v3/api-docs`.

## Требования к бэкенду

Отдавать валидную OpenAPI-схему (JSON) по `/v3/api-docs`.

## Частые проблемы

### `yarn api:pull`: `HTTP 404` или `fetch failed`

1. Запущен ли бэкенд и верный ли `VITE_BACKEND_URL`.
2. Открывается ли `{VITE_BACKEND_URL}/v3/api-docs` и возвращает ли именно JSON, а не HTML или ошибку авторизации.
3. Если путь другой — задать `API_SPEC_URL`.

### Клиент не обновился

Проверить, что `openapi.json` изменился после `api:pull`, затем запустить `yarn orval`.
