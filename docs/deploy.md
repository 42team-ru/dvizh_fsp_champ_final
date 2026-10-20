# Деплой

Сейчас сервер обновляется вручную: `make deploy` с компьютера разработчика — git pull и пересборка на
сервере в папке `/opt/app/source`. Пошагово: [dev-faq.md](dev-faq.md#как-задеплоить-обновление).

Ниже — автодеплой через GitHub Actions. Он готов, но выключен: включается переменной репозитория
`AUTO_DEPLOY=true`.

---

## 1. Как работает CI/CD

Push в `main` запускает `.github/workflows/deploy.yml`:

1. Параллельно **test** (`./gradlew check`, сборка фронта) и **images** (jar и фронт собираются на раннере
   с кэшем Gradle и Yarn).
2. Тонкие образы — `backend/Dockerfile.ci` (JRE + jar) и `frontend/Dockerfile.ci` (Caddy + `build/client`)
   — собираются за секунды и уходят в `ghcr.io/<owner>/<repo>/{app,web}` с тегами `latest` и `<sha>`.
3. **deploy**: по SSH на сервер кладётся `deploy/docker-compose.yml`, затем `docker compose pull` и
   `up -d --wait`.

На сервере ничего не собирается. На pull request идут только тесты и сборка образов без публикации.

**Почему быстро:**

- `docker build` ничего не компилирует — jar и фронт уже собраны.
- Jar в образе послойный: зависимости (~65 МБ) — отдельный слой, код — ~20 КБ. Обычный `pull` качает
  килобайты.
- `up -d --wait` — деплой краснеет, если бэкенд не стал healthy.
- Caddy повторяет запросы до 30 секунд (`lb_try_duration`), пока `app` перезапускается: вместо 502 —
  пауза.

AOT-кэш Java 25 не включён намеренно: он весит ~86 МБ и пересоздаётся на каждом деплое.

---

## 2. Секреты репозитория

GitHub → Settings → Secrets and variables → Actions.

| Имя                                   | Тип                   | Что это                                       |
|---------------------------------------|-----------------------|-----------------------------------------------|
| `VPS_HOST`                            | secret                | IP или домен сервера                          |
| `VPS_USER`                            | secret                | пользователь SSH, умеющий `docker`            |
| `VPS_SSH_KEY`                         | secret                | приватный ключ целиком, без passphrase        |
| `VPS_DIR`                             | variable              | папка на сервере, по умолчанию `/opt/app`     |
| `AUTO_DEPLOY`                         | variable              | `true` — деплоить после каждого push в `main` |
| `VITE_2GIS_KEY`                       | secret                | ключ 2ГИС; Vite вшивает его в сборку фронта   |
| `VITE_2GIS_MAP`, `VITE_2GIS_STYLE_ID` | secret, необязательно | движок карты и свой стиль                     |

Ключ 2ГИС нужен и бэкенду — в `.env` на сервере, для маршрутов «когда выходить».

---

## 3. Что лежит на сервере

| Что                  | Для чего                                                                             |
|----------------------|--------------------------------------------------------------------------------------|
| `docker-compose.yml` | кладёт CI при каждом деплое                                                          |
| `.env`               | пароль базы, домен, секрет JWT, Telegram; CI дописывает `IMAGE`, `TAG`, `JWT_SECRET` |
| `data/caddy/`        | сертификаты Let's Encrypt, переживают деплои и `down -v`                             |
| volume `pgdata`      | данные Postgres                                                                      |
| `data/minio/`        | файлы S3: аватары, фото, документы                                                   |
| volume `llmcache`    | модель модерации, качается при первом старте ([moderation.md](moderation.md))        |

---

## 4. Особенности

- **PWA.** Caddy отдаёт `/sw.js` и `/manifest.webmanifest` с `Cache-Control: no-cache`, `/assets/*` с
  хешами — как immutable, SPA-маршруты получают `index.html`. Для установки нужен HTTPS (кроме
  localhost). Проверка: [frontend.md](frontend.md).
- **Образы приватные.** Деплой логинится в GHCR токеном самого workflow.
- **amd64.** Образы собираются под amd64, PostGIS — тоже. Для ARM-сервера — `platforms: linux/arm64` в
  `build-push-action`.
