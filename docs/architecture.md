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
| `domain.entity` | JPA-сущности (наружу не отдаём, только через `dto`) |
| `domain.enums` | Enum-ы модели (`EventStatus`, `RegistrationStatus`, `OrganizationStatus`, `SystemRole`…): общие для сущностей, DTO и запросов |
| `domain.dto` | Запросы и ответы API (records, валидация) |
| `domain.mapper` | MapStruct: entity ↔ dto, **всё заполнение полей сущностей только здесь** (сервис — чистая бизнес-логика). Общий `@Mapper(config = MappingConfig.class)`: поля без источника пропускаются без `ignore = true`, строки идут через `util.Strings.blankToNull` (обрезка, пустые → `null`) |
| `util` | Статические утилиты без состояния (`Strings`) |
| `config` | Security, OpenAPI, `@ConfigurationProperties` |
| `demo` | Демо-данные (только при `DEMO_MODE=true`): сидеры, `/api/demo/accounts`, перенос дат в прошлое. Работает как клиент сервисов |
| `domain.exception` | Свои исключения и единый `ApiExceptionHandler` (RFC 9457) |

Зависимости идут только вниз: `rest → service → repository → entity`. Исключение — пакет `demo` (демо-данные): он вызывает сервисы как клиент, и ничто вне него от `demo` не зависит. Миграции БД: `backend/src/main/resources/db/migration` (Flyway, только вперёд; применённые миграции не править, добавлять новые `V5__...`).
Пример готового флоу: регистрация и вход (`AuthController`, `AuthService`).

## Мероприятия, записи, виды спорта (`EventController`, `RegistrationController`, `SportController`; миграции `V3__events.sql`, `V4__organizers_and_profile.sql`)
- Мероприятие (`events`) — центр модели. Вид спорта — справочник `sports` в БД; в форме можно выбрать из списка (`sportId`) или ввести свой (`sportName`):
  сервер нормализует имя (пробелы, регистр, ё → е), ищет по `normalized_name` и при отсутствии создаёт вид с `custom = true` (`SportService.resolve`).
- Все правила «можно ли» — в `service.EventAccessPolicy`. Команды бросают исключение с её текстом, карточка отдаёт те же решения в блоке `viewer`
  (`registrationStatus, canRegister, registerBlockedReason, isOrganizer, canManage, canCancel, canSeePrivateDetails`). Фронт рисует кнопки только по `viewer`.

| Ручка | operationId | Кто / что |
|---|---|---|
| `GET /api/sports?query=` | `sports_search` | справочник, поиск без учёта регистра и ё/е |
| `GET /api/events?searchText&sportId&from&to&level&joinMode&format` | `events_list` | лента: только PUBLISHED, по умолчанию с текущего момента; уровень ANY подходит под любой фильтр |
| `GET /api/events/mine` | `events_mine` | где я автор или соорганизатор, все статусы |
| `POST /api/events/{id}/organizers` `{"login"}` | `events_addOrganizer` | только автор; по логину или email; нельзя админа, уже организатора, записанного участника |
| `DELETE /api/events/{id}/organizers/{userId}` | `events_removeOrganizer` | автор убирает любого, соорганизатор может выйти сам; автора убрать нельзя |
| `GET /api/events/{id}` | `events_get` | карточка в любом статусе (снятое — с `moderationReason`), участники, `viewer`; `onlineUrl`/`privateDetails` — только организатору и подтверждённым |
| `POST /api/events` | `events_create` | сразу PUBLISHED; админ — 403; очному нужен `address` |
| `PUT /api/events/{id}` | `events_update` | только организатор (403); удалённое — 409; `capacity` не меньше подтверждённых — 409 |
| `POST /api/events/{id}/registrations` | `registrations_create` | FREE → CONFIRMED, REQUEST → PENDING; после отмены та же строка переиспользуется |
| `DELETE /api/events/{id}/registrations/me` | `registrations_cancel` | отмена своей записи/заявки до начала; повтор — 200; отклонённую — 409 |
| `GET /api/events/{id}/registrations?status=` | `registrations_listForEvent` | заявки и участники — только организатор |
| `POST /api/registrations/{id}/approve` | `registrations_approve` | организатор; можно подтвердить и ранее отклонённого (исправить ошибку); нет мест — 409 |
| `POST /api/registrations/{id}/reject` `{"reason"?}` | `registrations_reject` | организатор; причину участник видит в «моих записях» |
| `GET /api/registrations/mine` | `registrations_mine` | мои записи вместе со статусом мероприятия |

- Организаторы: автор + соорганизаторы (`event_organizers`). Соорганизатор правит мероприятие, видит и решает заявки, видит приватные детали — как автор;
  состав меняет только автор (`viewer.canManageOrganizers`). В карточке список `organizers`, автор первым.
- Отказы записи (409, текст для человека): снято/удалено, организатор на своё, уже началось, уже записан, заявка ждёт, отклонена, «Мест нет».
  Админ заявки не решает и события не создаёт (403). Сам отклонённый повторно подать не может — исправляет организатор через approve.
- Запись и одобрение — под блокировкой строки мероприятия (`EventRepository.findByIdForUpdate`), лимит мест не превысить параллельно.
  Счётчики участников для списков — одним запросом (`RegistrationRepository.countByEventIds`).
- id генерирует Hibernate (UUID). `createdAt`/`updatedAt` — в базовом `domain.entity.AuditEntity`. Время для проверок («уже началось», `decidedAt`) — у базы: `DbTimeRepository.now()`.
- Фильтры ленты — Criteria API (`EventSpecifications`), переносимо на H2.
- Контроллеры логируют на английском `Endpoint called: <METHOD> <путь>, userId=..., request=...` и `Endpoint response: ...`. Если сервис бросил исключение (4xx), строки `Endpoint response` не будет.
- Ещё не сделано: события от организации (`organization_id` есть в схеме; ждёт `Organization`), модерация админом (поля есть), комментарии.

## Правила для контроллеров
- Только под `/api/...`, с `produces = APPLICATION_JSON_VALUE` (иначе в спецификации будет `*/*`, и Orval сгенерирует `string` вместо типа).
- `@Tag(name = "...")` и `@Operation(operationId = "<tag>_<действие>")`: от этого зависят имена хуков на фронте (`useAuthLogin`).
- Возвращать `record`-ы, а не `Map`.

## Контракт API и фронт
Спецификация лежит в git: `frontend/src/shared/api/schemas/openapi.json`; клиент и хуки React Query генерирует Orval в `frontend/src/shared/api/generated/core` (тоже в git, поэтому фронт собирается без бэкенда).
Поменяли контроллер или DTO → поднять бэк (`make back`) → `cd frontend && yarn api:sync` → закоммитить `openapi.json` и `generated/`. Подробности: [orval.md](orval.md).

## Авторизация
JWT в двух HttpOnly cookie: `access_token` (15 минут) и `refresh_token` (14 дней, хранится в БД только хешем, ротируется; повторное использование погашенного токена гасит все сессии пользователя). Защита от CSRF: `SameSite=Lax`. `/api/**` требует входа, кроме регистрации, входа, refresh, logout, проверок доступности имени и email, `ping` и Swagger.
