# Hackathon template

Java 25 + Spring Boot 4.1 (Gradle Kotlin DSL) · React + Vite + TS (yarn) · Postgres 18 alpine · Caddy · Docker.

## Для жюри / демо: одна команда
```bash
docker compose up --build      # нужен только Docker
```
Откроется на http://localhost:8080 (порт меняется через `PORT=80 docker compose up --build`).
Всё собирается из исходников в multi-stage Dockerfile'ах (`backend/Dockerfile`, `frontend/Dockerfile`),
Postgres поднимается сам, миграции применяются при старте. Первая сборка ~2–3 мин, дальше кэш.
Swagger: http://localhost:8080/swagger-ui.html

**Демо-режим** включён автоматически (`DEMO_MODE=true` в `docker-compose.yml`): при старте создаются аккаунты `admin` (админ), `ivan` и `maria` с паролем `demo-password-1`, а на странице входа появляются кнопки, которые подставляют логин и пароль в форму. Пароль публичный, поэтому на сервере с реальными пользователями режим выключен (`DEMO_MODE=false` по умолчанию в `deploy/`; для демо-сервера добавить `DEMO_MODE=true` в `/opt/app/.env`).

## Быстрый старт (разработка)
```bash
make dev     # Postgres в докере (порт 5440, не конфликтует с локальным 5432); один раз, дальше работает сам
make back    # бэкенд http://localhost:8080 (swagger: /swagger-ui.html), в своём терминале
make front   # фронт   http://localhost:5173 (/api проксируется на бэк), в своём терминале
make dev-down  # остановить БД разработки
# без make: node scripts/dev.mjs [back|front] (работает и на Windows)
# бэк и фронт запускаются отдельно, чтобы каждый перезапускать независимо: Ctrl+C и снова make back
```

## Git-хуки
Включаются сами при `yarn install` или первой сборке Gradle (вручную: `make hooks`), нужен Node. Хуки проверяют сообщения коммитов и добавленный код на запрещённые слова и не пропускают мусорные файлы (`make junk` — отчёт, `make clean` — убрать артефакты сборки).

## Деплой через GitHub Actions + GHCR
Push в `main` → `.github/workflows/deploy.yml`:
1. параллельно: **test** (тесты бэка, typecheck фронта) и **images** (jar и фронта (`build/client`) собираются на раннере с кэшем Gradle/Yarn);
2. тонкие образы (`backend/Dockerfile.ci` = JRE + jar, `frontend/Dockerfile.ci` = Caddy + build/client) собираются за секунды и пушатся в `ghcr.io/<owner>/<repo>/{app,web}` (теги `latest` и `<sha>`);
3. **deploy**: на VPS кладётся `docker-compose.yml`, `docker compose pull` (качаются только изменившиеся слои) и `up -d`.

Почему это быстро:
- jar и фронта (`build/client`) собираются на раннере с кэшем, `docker build` ничего не компилирует (тонкие образы, секунды);
- jar в образе **послойный** (`jarmode=tools extract --layers`): зависимости (~65 МБ) в отдельном слое, слой с кодом ~20 КБ → `pull` на VPS при обычном деплое качает килобайты;
- `docker compose up -d --wait`: деплой падает красным, если бэк не стал healthy;
- Caddy ретраит запросы до 30 с (`lb_try_duration`), пока `app` перезапускается, — вместо 502 пользователь видит лишь паузу;
- Gradle: build/config cache (`backend/gradle.properties`) + `setup-gradle` в CI.

Осознанно не включено: AOT-кэш Java 25 — он весит ~86 МБ и пересоздаётся на каждый деплой, то есть возвращает полный `pull` ради пары секунд старта.

На VPS ничего не собирается. Откат: в `/opt/app/.env` поставить `TAG=<старый sha>` и `docker compose up -d`.
На PR идёт только test + сборка образов без push.

Настроить один раз:
1. На VPS: `./scripts/server-setup.sh` (нужен локальный `.env` с `VPS_HOST=user@ip`) — ставит Docker и создаёт `/opt/app/.env`.
2. SSH-ключ: `ssh-keygen -t ed25519 -f deploy_key -N ""`, публичный — в `~/.ssh/authorized_keys` на VPS.
3. GitHub → Settings → Secrets and variables → Actions: secrets `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`; variable (опц.) `VPS_DIR` (по умолчанию `/opt/app`).
4. HTTPS: в `/opt/app/.env` на сервере `DOMAIN=your.domain`.
   Сертификаты Caddy лежат в обычной папке `/opt/app/data/caddy` (bind mount, не docker volume), поэтому
   переживают деплои, `docker compose down -v` и `docker volume prune` — перевыпуска не будет (у Let's Encrypt есть лимиты).
   Не удаляйте `/opt/app/data/` при «чистой» переустановке; для полной зачистки контейнеров и БД: `docker compose down -v` (сертификаты останутся).

Образы приватные по умолчанию; деплой логинится на VPS токеном workflow. Образ собирается под amd64 (раннер). Для ARM-VPS добавьте `platforms: linux/arm64` в build-push-action.

## API-клиент для фронта (Orval)
Контракт = `frontend/openapi.json` (лежит в git). Из него Orval генерит типы и React Query хуки в `frontend/src/api/generated` (тоже в git, поэтому Docker/CI фронта собираются без бэка).

```bash
# бэк запущен (make back или docker compose up)
cd frontend && yarn api          # = api:pull (скачать спеку) + api:gen (сгенерить код)
```
- Другой адрес бэка: `API_URL=https://my.vps yarn api:pull` или полный путь `API_SPEC_URL=...`.
- Только перегенерить из уже имеющегося файла: `yarn api:gen`.
- Использование: `const { data } = usePing()` (хуки именуются по методам контроллеров).
- **Правило для контроллеров:** `@RequestMapping(path=..., produces = APPLICATION_JSON_VALUE)`, иначе в спеке будет `*/*` и Orval сгенерит `string` вместо типа. Возвращайте `record`-ы, а не `Map`.
- Поменяли контроллер/DTO → `yarn api` → закоммитить `openapi.json` и `src/api/generated`.

## Структура
- `backend/` — Spring Boot (web, validation, data-jpa, flyway, postgres, security + JWT в cookie, actuator, springdoc, lombok). Миграции: `src/main/resources/db/migration`. Пакеты `com.hackathon.app` по слоям:
  - `rest` — контроллеры (только HTTP: разобрать запрос, вызвать сервис, вернуть DTO; cookie);
  - `service` — бизнес-логика и транзакции, не знает про HTTP;
  - `repository` — Spring Data интерфейсы доступа к БД;
  - `entity` — JPA-сущности (наружу не отдаём, только через `dto`);
  - `dto` — запросы и ответы API (records, валидация);
  - `config` — Security, OpenAPI, `@ConfigurationProperties`;
  - `exception` — свои исключения и единый `ApiExceptionHandler` (RFC 9457).
  Зависимости идут только вниз: `rest → service → repository → entity`. Пример готового флоу: регистрация и вход (`AuthController`, `AuthService`).
- `frontend/` — Vite + React заглушка.
- `deploy/` — prod `docker-compose.yml` (образы из GHCR) + `Caddyfile` (`/api` → бэк, остальное → SPA).
- `*/Dockerfile` — полная сборка из исходников (для жюри); `*/Dockerfile.ci` — тонкие образы для CI.
- `docker-compose.dev.yml` — только БД для разработки.
