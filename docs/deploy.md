# Как устроен деплой

Push в `main` запускает `.github/workflows/deploy.yml`:
1. Параллельно: **test** (тесты бэка `./gradlew check`, сборка фронта) и **images** (jar и фронт собираются на раннере с кэшем Gradle и Yarn).
2. Тонкие образы (`backend/Dockerfile.ci` = JRE + jar, `frontend/Dockerfile.ci` = Caddy + `build/client`) собираются за секунды и пушатся в `ghcr.io/<owner>/<repo>/{app,web}` с тегами `latest` и `<sha коммита>`.
3. **deploy**: по SSH на сервер кладётся `deploy/docker-compose.yml`, затем `docker compose pull` и `up -d --wait`.

На сервере ничего не собирается. На pull request идут только test и сборка образов без публикации.

## Почему это быстро
- Jar и фронт собираются на раннере с кэшем, `docker build` ничего не компилирует (тонкие образы, секунды).
- Jar в образе послойный (`jarmode=tools extract --layers`): зависимости (~65 МБ) в отдельном слое, слой с кодом ~20 КБ, поэтому обычный `pull` на сервере качает килобайты.
- `docker compose up -d --wait`: деплой краснеет, если бэкенд не стал healthy.
- Caddy ждёт и повторяет запросы до 30 с (`lb_try_duration`), пока `app` перезапускается, вместо 502 пользователь видит лишь паузу.
- Gradle: build cache и configuration cache (`backend/gradle.properties`) плюс `setup-gradle` в CI.

## Что нужно один раз
> **Сейчас автодеплой выключен:** сервер обновляется вручную командой `make deploy` из одной папки (`docs/dev-faq.md`, «Как задеплоить обновление»). Ниже — как устроен деплой через Actions, если включить его переменной `AUTO_DEPLOY=true`.

Секреты и переменные репозитория (GitHub → Settings → Secrets and variables → Actions):

| Имя | Тип | Что это |
|---|---|---|
| `VPS_HOST` | secret | IP или домен сервера |
| `VPS_USER` | secret | пользователь SSH (должен уметь `docker`) |
| `VPS_SSH_KEY` | secret | приватный ключ целиком, без пароля (passphrase) |
| `VPS_DIR` | variable, необязательно | папка на сервере, по умолчанию `/opt/app` |
| `AUTO_DEPLOY` | variable | `true` — деплоить после каждого пуша в `main`; без неё CI только собирает и тестирует |
| `VITE_2GIS_KEY` | secret | ключ 2ГИС: фронт собирается в CI, Vite вшивает ключ в сборку. Без него карта не загрузится, остальное работает. Тот же ключ нужен и бэку в `/opt/app/.env` — маршруты для подсказки «когда выходить» (без него — оценка по расстоянию) |
| `VITE_2GIS_MAP` | secret, необязательно | `raster` (по умолчанию) или `mapgl`; передаётся при сборке фронта |
| `VITE_2GIS_STYLE_ID` | secret, необязательно | ID своего стиля MapGL; без него стандартный стиль. RasterJS его не использует |

Для MapGL включить ключу доступ к **MapGL JS API** в [кабинете 2ГИС](https://platform.2gis.ru/); для fallback нужен и RasterJS. Ограничить ключ доменом стенда (и `localhost` для разработки). При ошибке загрузки/инициализации MapGL или отсутствии WebGL карта автоматически пробует RasterJS и пишет `console.warn`.

Свой стиль: [styles.2gis.com](https://styles.2gis.com) → создать/сохранить → **Мои стили → Поделиться → Идентификатор стиля** → `VITE_2GIS_STYLE_ID`. Рекомендованные цвета из токенов — в [map-frontend.md](map-frontend.md#свой-стиль-memphis).

При сборке корневым `docker compose` все три `VITE_2GIS_*` берутся из корневого `.env` и передаются как build args в `frontend/Dockerfile`. В Actions это одноимённые secrets. После изменения параметров пересобрать фронт: Vite вшивает значения в JS, runtime env готового Caddy-образа на них не влияет. Для сравнения одной сборки доступны `?map=mapgl` и `?map=raster` (приоритет над env; страницу перезагрузить).

Подготовка самого сервера и все остальные операции описаны в [dev-faq.md](dev-faq.md).

## Что лежит на сервере (`/opt/app`)
| Что | Для чего |
|---|---|
| `docker-compose.yml` | кладёт CI при каждом деплое |
| `.env` | настройки (пароль БД, домен, секрет JWT, версия образа, Telegram-бот уведомлений); CI дописывает `IMAGE`, `TAG`, `JWT_SECRET` |
| `data/caddy/` | сертификаты Let's Encrypt (обычная папка, переживает деплои и `docker compose down -v`) |
| docker volume `pgdata` | данные Postgres |
| `data/minio/` | файлы S3 (MinIO): аватарки, фото, документы; обычная папка, переживает `down -v` |

## Особенности
- Образы приватные по умолчанию; на сервере деплой логинится в GHCR токеном самого workflow.
- Образы собираются под amd64 (раннер). Для ARM-сервера добавьте `platforms: linux/arm64` в `build-push-action`.
- Не включено сознательно: AOT-кэш Java 25. Он весит ~86 МБ и пересоздаётся при каждом деплое, то есть вернул бы полный `pull` ради пары секунд старта.
