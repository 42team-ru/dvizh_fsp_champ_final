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
| `mapper` | MapStruct: entity ↔ dto, **всё заполнение полей сущностей только здесь** (сервис — чистая бизнес-логика). Общий `@Mapper(config = MappingConfig.class)`: поля без источника пропускаются без `ignore = true`, строки идут через `util.Strings.blankToNull` (обрезка, пустые → `null`) |
| `util` | Статические утилиты без состояния (`Strings`) |
| `config` | Security, OpenAPI, `@ConfigurationProperties` |
| `exception` | Свои исключения и единый `ApiExceptionHandler` (RFC 9457) |

Зависимости идут только вниз: `rest → service → repository → entity`. Миграции БД: `backend/src/main/resources/db/migration` (Flyway, только вперёд; применённые миграции не править, добавлять новые `V3__...`).
Пример готового флоу: регистрация и вход (`AuthController`, `AuthService`).

## Мероприятия (`EventController`, `SportController`, `EventService`, миграция `V3__events.sql`)
- Мероприятие (`events`) — центр модели. Вид спорта — справочник `sports` в БД (сидится миграцией), новый вид не требует кода.
- `GET /api/sports` — справочник; `POST /api/events` — создать (автор = текущий пользователь, сразу `PUBLISHED`);
  `GET /api/events/{id}` — карточка с `participantsCount` и `myRegistrationStatus`; `GET /api/events/{id}/participants` — подтверждённые участники;
  `POST /api/events/{id}/join` — записаться (`{"message"?}`); после отмены — та же ручка, запись возобновляется;
  `POST /api/events/{id}/cancel` — отменить свою запись/заявку (место освобождается; повторное нажатие — 200; отклонённую — 409; после старта — 409);
  `GET /api/events/{id}/registrations?status=` — все заявки (только организатор, иначе 403);
  `PATCH /api/events/{id}/registrations/{registrationId}` `{"status":"CONFIRMED"|"REJECTED"}` — решение организатора.
- Решение можно пересматривать сколько угодно: случайно отклонённого организатор находит в `?status=REJECTED` и подтверждает
  (если есть места). Сам отклонённый повторно подать заявку не может (иначе отказ ничего не значит). Отменённую пользователем запись решение не трогает (409).
- Офлайн-мероприятию обязателен `address` (координаты по желанию), онлайн — место/ссылка в `locationNote`.
- Запись (`registrations`, unique(event_id, user_id)): `joinMode=FREE` → сразу `CONFIRMED`, `REQUEST` → `PENDING`.
  Отказ (409): организатор на своё, уже началось, уже записан/заявка ждёт/отклонена, нет мест (`capacity`).
  Строка мероприятия блокируется (`SELECT ... FOR UPDATE`), поэтому лимит мест не превышается при параллельной записи.
- id генерирует Hibernate (UUID). `createdAt`/`updatedAt` — в базовом `entity.AuditEntity` (`@MappedSuperclass`), сущности от него наследуются.
- Текущее время для бизнес-проверок («мероприятие уже началось», `decidedAt`) берётся у базы: `DbTimeRepository.now()`, а не `Clock`.
- Контроллеры логируют на английском `Endpoint called: <METHOD> <путь>, userId=..., request=...` и `Endpoint response: <METHOD> <путь>, response=...`. Если сервис бросил исключение (4xx), строки `Endpoint response` не будет: ответ формирует `ApiExceptionHandler`.
- `organization_id` и поля модерации уже в схеме, но API их пока не заполняет. Комментарии не реализованы.

## Правила для контроллеров
- Только под `/api/...`, с `produces = APPLICATION_JSON_VALUE` (иначе в спецификации будет `*/*`, и Orval сгенерирует `string` вместо типа).
- `@Tag(name = "...")` и `@Operation(operationId = "<tag>_<действие>")`: от этого зависят имена хуков на фронте (`useAuthLogin`).
- Возвращать `record`-ы, а не `Map`.

## Контракт API и фронт
Спецификация лежит в git: `frontend/src/shared/api/schemas/openapi.json`; клиент и хуки React Query генерирует Orval в `frontend/src/shared/api/generated/core` (тоже в git, поэтому фронт собирается без бэкенда).
Поменяли контроллер или DTO → поднять бэк (`make back`) → `cd frontend && yarn api:sync` → закоммитить `openapi.json` и `generated/`. Подробности: [orval.md](orval.md).

## Авторизация
JWT в двух HttpOnly cookie: `access_token` (15 минут) и `refresh_token` (14 дней, хранится в БД только хешем, ротируется; повторное использование погашенного токена гасит все сессии пользователя). Защита от CSRF: `SameSite=Lax`. `/api/**` требует входа, кроме регистрации, входа, refresh, logout, проверок доступности имени и email, `ping` и Swagger.
