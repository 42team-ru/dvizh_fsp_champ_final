# Структура проекта

```
backend/     Spring Boot 4 (Java 25, Gradle Kotlin DSL)
frontend/    React Router 7 (SPA), Vite, Tailwind, yarn
deploy/      прод: docker-compose.yml (образы из GHCR) + Caddyfile
scripts/     dev.mjs (запуск разработки), hygiene.mjs (проверка коммитов), server-setup.sh
docs/        документация
docker-compose.yml      всё из исходников одной командой (жюри / ручной деплой)
docker-compose.dev.yml  только БД для разработки
*/Dockerfile            полная сборка из исходников; */Dockerfile.ci — тонкие образы для CI
```
Единая точка входа — Caddy: `/api/*` идёт на бэкенд, всё остальное отдаёт собранный фронт (SPA).

## Бэкенд по слоям (`com.hackathon.app`)
| Пакет | Что внутри |
|---|---|
| `rest` | Контроллеры: только HTTP (разобрать запрос, вызвать сервис, вернуть DTO), cookie |
| `service` | Бизнес-логика и транзакции, не знает про HTTP |
| `repository` | Spring Data интерфейсы доступа к БД |
| `entity` | JPA-сущности (наружу не отдаём, только через `dto`) |
| `dto` | Запросы и ответы API (records, валидация) |
| `config` | Security, OpenAPI, `@ConfigurationProperties` |
| `exception` | Свои исключения и единый `ApiExceptionHandler` (RFC 9457) |

Зависимости идут только вниз: `rest → service → repository → entity`. Миграции БД: `backend/src/main/resources/db/migration` (Flyway, только вперёд; применённые миграции не править, добавлять новые `V3__...`).
Пример готового флоу: регистрация и вход (`AuthController`, `AuthService`).

## Правила для контроллеров
- Только под `/api/...`, с `produces = APPLICATION_JSON_VALUE` (иначе в спецификации будет `*/*`, и Orval сгенерирует `string` вместо типа).
- `@Tag(name = "...")` и `@Operation(operationId = "<tag>_<действие>")`: от этого зависят имена хуков на фронте (`useAuthLogin`).
- Возвращать `record`-ы, а не `Map`.

## Контракт API и фронт
Спецификация лежит в git: `frontend/src/shared/api/schemas/openapi.json`; клиент и хуки React Query генерирует Orval в `frontend/src/shared/api/generated/core` (тоже в git, поэтому фронт собирается без бэкенда).
Поменяли контроллер или DTO → поднять бэк (`make back`) → `cd frontend && yarn api:sync` → закоммитить `openapi.json` и `generated/`. Подробности: [orval.md](orval.md).

## Авторизация
JWT в двух HttpOnly cookie: `access_token` (15 минут) и `refresh_token` (14 дней, хранится в БД только хешем, ротируется; повторное использование погашенного токена гасит все сессии пользователя). Защита от CSRF: `SameSite=Lax`. `/api/**` требует входа, кроме регистрации, входа, refresh, logout, проверок доступности имени и email, `ping` и Swagger.
