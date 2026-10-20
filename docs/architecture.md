# Архитектура

```
backend/                Spring Boot 4.1, Java 25, Gradle Kotlin DSL
frontend/               React Router 7 (SPA), Vite, Tailwind 4, Yarn
deploy/                 docker-compose.yml для сервера (образы из GHCR) и Caddyfile
scripts/                dev.mjs (локальный запуск), demo_photos.py
docker-compose.yml      всё из исходников одной командой
docker-compose.dev.yml  только Postgres и MinIO для разработки
```

Единая точка входа — Caddy: `/api/*` уходит на бэкенд, всё остальное — собранный фронт.

---

## 1. Бэкенд по слоям

Пакет `com.hackathon.app`. Зависимости только вниз: `rest → service → repository → domain`.

| Пакет              | Что внутри                                                                       |
|--------------------|----------------------------------------------------------------------------------|
| `rest`             | Контроллеры: разобрать запрос, вызвать сервис, вернуть DTO. Только HTTP и cookie |
| `service`          | Бизнес-логика, права и транзакции. Про HTTP не знает                             |
| `repository`       | Spring Data; пространственные запросы — нативным SQL в `EventMapRepository`      |
| `domain.entity`    | JPA-сущности. Наружу не отдаются                                                 |
| `domain.dto`       | Запросы и ответы API — records с валидацией                                      |
| `domain.mapper`    | MapStruct. Все поля сущностей заполняются только здесь, в сервисах сеттеров нет  |
| `domain.enums`     | Enum модели, по файлу на enum                                                    |
| `domain.exception` | Свои исключения и `ApiExceptionHandler`                                          |
| `config`           | Security, OpenAPI, `@ConfigurationProperties`                                    |
| `util`             | Статические утилиты без состояния                                                |
| `demo`             | Демо-данные. Вызывает сервисы как клиент; от `demo` ничто не зависит             |

Новая фича — новые файлы в этих пакетах, а не новый корневой пакет.

---

## 2. Правила

**Права — в одном месте.** Всё «можно ли» про мероприятие (записаться, отменить, управлять, видеть
приватные детали) решает `EventAccessPolicy`. Им пользуются и команды, и сборка ответа: карточка
приходит с блоком `viewer`, фронт рисует кнопки только по нему. Свой вариант той же проверки в
контроллере или на фронте — ошибка.

**Гонки.** Запись и одобрение заявки берут блокировку строки мероприятия (`EventRepository.findByIdForUpdate`), поэтому
двое не займут последнее место.

**Время.** Для проверок («уже началось», `decidedAt`) время берётся у базы — `DbTimeRepository.now()`,
а не из `Clock` приложения.

**Сущности.** Ключ — UUID от Hibernate, `createdAt`/`updatedAt` — в базовом `AuditEntity`, enum хранится
строкой. Уникальность и индексы — в миграциях, не в аннотациях.

**Счётчики не хранятся.** «Записались 8 из 16» считается одним запросом по списку мероприятий.

**Удаление мягкое.** У мероприятия `status = DELETED`, у сообщения — `deletedAt`: записавшиеся видят, что
произошло.

---

## 3. Контроллеры и контракт API

- Только под `/api/...` и с `produces = APPLICATION_JSON_VALUE`, иначе в схеме будет `*/*` и Orval
  сгенерирует `string` вместо типа.
- `@Tag` и `@Operation(operationId = "<тег>_<действие>")` — от `operationId` зависят имена хуков на
  фронте (`events_get` → `useEventsGet`).
- Возвращаются records, не `Map` и не сущности.
- Текущий пользователь — `@AuthenticationPrincipal Jwt jwt`; в сервис передаётся `UUID`, не `Jwt`.
- Лог: `Endpoint called: <METHOD> <путь>, userId=…, request=…` и `Endpoint response: …` на английском.

Схема лежит в git — `frontend/src/shared/api/schemas/openapi.json`, клиент Orval — в
`frontend/src/shared/api/generated/core`. Фронт собирается без бэкенда. Поменяли API:

```bash
make back                      # поднять бэкенд с новой схемой
cd frontend && yarn api:sync   # скачать схему и пересобрать клиент
```

и закоммитить `openapi.json` вместе с `generated/`. Подробнее: [orval.md](orval.md).

---

## 4. База

PostgreSQL 18 с PostGIS, миграции Flyway в `backend/src/main/resources/db/migration`.

- Миграции только вперёд. Применённую не править, новую — следующим номером. Номер занимать после
  `git pull`: два одинаковых Flyway не запустит.
- В проде `ddl-auto: validate`: миграции обязаны совпадать с сущностями. Проверка —
  `./gradlew postgresTest`.
- Тесты идут на H2, схема строится из сущностей. Поэтому запросы, которые проходят через тесты, пишутся
  переносимо: JPQL, derived-методы, Criteria API (`EventSpecifications`). PostGIS, `pg_trgm` и `jsonb` —
  только в нативных запросах, которые H2 не вызывает.
- Точка мероприятия хранится как `lat`/`lon`, а колонку `location geometry` база вычисляет сама (`GENERATED ... STORED`,
  GiST-индекс). В сущности её нет.

---

## 5. Вход

JWT в двух HttpOnly cookie:

| Cookie          | Срок     | Что это                                                               |
|-----------------|----------|-----------------------------------------------------------------------|
| `access_token`  | 15 минут | JWT, роль в клейме `role` → `ROLE_<роль>`                             |
| `refresh_token` | 14 дней  | случайная строка; в базе только хеш, ротируется при каждом обновлении |

Повторное использование уже погашенного refresh-токена гасит все сессии пользователя. CSRF закрыт
`SameSite=Lax`. `/api/admin/**` требует роль `ADMIN` прямо в `SecurityConfig`, остальные права — в
сервисах. Статус допуска организации всегда читается из базы, а не из токена.

---

## 6. Ошибки

Единый формат — RFC 9457 `ProblemDetail` через `ApiExceptionHandler`:

| Исключение                                         | HTTP |
|----------------------------------------------------|------|
| `BadRequestException`, ошибки `@Valid`             | 400  |
| `UnauthorizedException`                            | 401  |
| `ForbiddenException`                               | 403  |
| `NoSuchElementException`                           | 404  |
| `ConflictException`, нарушение уникальности в базе | 409  |
| `ServiceUnavailableException`                      | 503  |

`detail` пишется по-русски для человека — фронт показывает его как есть.
