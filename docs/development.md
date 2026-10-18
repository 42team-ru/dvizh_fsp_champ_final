# Локальная разработка

Нужны: Java 25, Node (+ yarn), Docker.

## Запуск
```bash
make dev     # Postgres в докере (порт 5440, не конфликтует с локальным 5432); один раз, дальше работает сам
make back    # бэкенд  http://localhost:8080 (swagger: /swagger-ui.html), в своём терминале
make front   # фронт    http://localhost:5173 (/api проксируется на бэк), в своём терминале
make dev-down  # остановить БД разработки (данные сохраняются)
```
Без make: `node scripts/dev.mjs [back|front]` (работает и на Windows).
Бэкенд и фронт запускаются **отдельно**, чтобы каждый можно было быстро перезапустить: Ctrl+C и снова `make back`.
Бэкенд можно запускать и из IDE (класс `TestAppApplication` или `AppApplication`).

## Всё одной командой (как у жюри)
```bash
docker compose up --build      # http://localhost:8080, нужен только Docker
```
Всё собирается из исходников (`backend/Dockerfile`, `frontend/Dockerfile`), миграции применяются при старте. Первая сборка ~2–3 минуты.
Порт меняется так: `PORT=80 docker compose up --build`.

## Демо-режим
В корневом `docker-compose.yml` включён (`DEMO_MODE=true`): при старте создаются аккаунты `admin` (админ), `ivan` и `maria` с паролем `demo-password-1`, а на странице входа появляются кнопки, которые подставляют логин и пароль в форму. Пароль публичный, поэтому на сервере с реальными пользователями режим выключен (`DEMO_MODE=false` по умолчанию в `deploy/`). Включить на демо-сервере: [dev-faq.md](dev-faq.md#как-включить-или-выключить-демо-режим).

## Тесты
```bash
cd backend
./gradlew test           # быстрые, на H2, Docker не нужен
./gradlew postgresTest   # смоук на настоящем Postgres (Testcontainers, нужен Docker)
./gradlew check          # оба; так же гоняет CI
```

## Git-хуки
Включаются сами при `yarn install` или первой сборке Gradle (вручную: `make hooks`), нужен Node. Хуки проверяют сообщения коммитов и добавленный код на запрещённые слова и не пропускают мусорные файлы.
`make junk` — отчёт по мусору в git, `make clean` — удалить локальные артефакты сборки, `make scan` — отчёт по истории и коду.
