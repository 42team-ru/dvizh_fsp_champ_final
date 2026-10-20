# Локальная разработка

Нужны Java 25, Node.js с Yarn и Docker.

---

## 1. Запуск

```bash
make dev        # Postgres с PostGIS (:5440) и MinIO (:9440) в Docker; один раз
make back       # бэкенд  http://localhost:8080, Swagger /swagger-ui.html
make front      # фронт   http://localhost:5173, /api проксируется на бэкенд
make dev-down   # остановить Postgres и MinIO, данные сохраняются
```

Бэкенд и фронт — в разных терминалах, чтобы перезапускать по отдельности: Ctrl+C и снова `make back`.
Без `make`: `node scripts/dev.mjs back` и `node scripts/dev.mjs front`, работает и на Windows. Бэкенд
можно запускать из IDE — класс `AppApplication`.

| Сервис   | Адрес                                                 | Доступ                   |
|----------|-------------------------------------------------------|--------------------------|
| Postgres | `localhost:5440`, база `app`                          | `app` / `app`            |
| MinIO    | API `localhost:9440`, консоль <http://localhost:9441> | `app` / `app-secret-dev` |

Всё одной командой, как у жюри: `docker compose up --build` → <http://localhost:8080>.

---

## 2. Демо-данные

Создаются при старте бэкенда, если `DEMO_MODE=true` (по умолчанию) и в базе нет аккаунта `admin`.
Сид идёт в фоне: бэкенд готов через секунды, демо-аккаунты появляются сразу, остальное — за 3–4 минуты, до
строки `Demo data seeded` в логе.

Пересоздать локальную базу:

```bash
docker compose -f docker-compose.dev.yml down -v && make dev
```

Обычный `docker compose down -v` стирает только стек из `docker-compose.yml`, а не базу `make dev`.

Аккаунты и что в демо: [README](../README.md#демо-аккаунты). Фото для демо: [CONFIG.md](CONFIG.md#4-демо-режим).

---

## 3. Тесты

```bash
cd backend
./gradlew test           # сквозные сценарии на H2, Docker не нужен
./gradlew postgresTest   # миграции Flyway на настоящем Postgres (Testcontainers, нужен Docker)
./gradlew check          # оба; так же гоняет CI
cd ../frontend && yarn typecheck
```

Тесты — «почти E2E»: `@SpringBootTest` + MockMvc, весь контекст и настоящая цепочка Security. Пишутся
через тестовый API `e2e/support` (`TestApi`, `Actor`, `ApiAssertions`): `api.newUser("petya")`,
`petya.joinEvent(id)`, отказ — `assertThatApi(() -> …).fails(FORBIDDEN, "текст")`. Демо-режим тестами не
покрывается.

---

## 4. Файлы

Аватары, логотипы, документы организаций и фото хранятся в S3-бакете `app-files` (бэкенд создаёт его сам),
метаданные — в таблице `files`. Браузер получает файл только через `GET /api/files/{id}` с проверкой прав;
MinIO наружу не открыт.

| Что                   | Форматы        | Размер   | Сколько                                                          |
|-----------------------|----------------|----------|------------------------------------------------------------------|
| изображения           | JPG, PNG, WebP | до 5 МБ  | фото мероприятия — до 6, галерея профиля — до 6, альбом — до 200 |
| документы организации | PDF, JPG, PNG  | до 10 МБ | до 10                                                            |

Формат определяется по первым байтам, а не по расширению. `STORAGE_TYPE=memory` — файлы в памяти
процесса, без MinIO (так работают тесты). Подключить любой S3: [CONFIG.md](CONFIG.md#2-данные).

---

## 5. Git-хуки

Включаются сами при `yarn install` или первой сборке Gradle; вручную — `make hooks`. Нужен Node.

- Сообщения коммитов и добавленный код проверяются на подписи агентов и мат.
- Мусор (`.env`, `*.log`, `build`, `node_modules`, `.idea`, ключи) в коммит не пропускается.
- Хук не обходится через `--no-verify`: если он блокирует, исправить текст.

| Команда      | Что                                  |
|--------------|--------------------------------------|
| `make junk`  | отчёт по мусору, уже попавшему в git |
| `make clean` | удалить локальные артефакты сборки   |
| `make scan`  | отчёт по истории и дереву            |
