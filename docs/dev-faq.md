# FAQ по серверу

Короткие рецепты. Как устроен автодеплой: [deploy.md](deploy.md). Сервер — Ubuntu/Debian, команды
выполняются на нём по SSH, если не сказано иное. Папка деплоя — `/opt/app`.

- [Задеплоить обновление](#как-задеплоить-обновление)
- [Поднять проект на новом сервере](#как-поднять-проект-на-новом-сервере)
- [Поменять сервер для GitHub Actions](#как-поменять-сервер-для-github-actions)
- [Откатиться на прошлую версию](#как-откатиться-на-прошлую-версию)
- [Включить или выключить демо-режим](#как-включить-или-выключить-демо-режим)
- [Подключить домен и HTTPS](#как-подключить-домен-и-https)
- [Логи, статус, перезапуск](#логи-статус-перезапуск)
- [Перенести базу на другой сервер](#как-перенести-базу-на-другой-сервер)
- [Переменные .env на сервере](#переменные-env-на-сервере)
- [Частые ошибки](#частые-ошибки)

---

## Как задеплоить обновление

Сервер живёт в одной папке `/opt/app/source`: клон репозитория, рядом `.env`, корневой
`docker-compose.yml` сам собирает бэкенд и фронт. С вашего компьютера:

```bash
make deploy        # ssh на VPS_HOST → cd VPS_DIR/source → make prod
```

`VPS_HOST` и `VPS_DIR` берутся из корневого `.env`; нужен SSH без пароля (ваш ключ в
`~/.ssh/authorized_keys` сервера).

На самом сервере в `/opt/app/source`:

| Команда          | Что                                                     |
|------------------|---------------------------------------------------------|
| `make prod`      | git pull, пересборка, перезапуск с ожиданием готовности |
| `make prod-logs` | логи                                                    |
| `make prod-down` | остановить, данные сохраняются                          |

Проверка: `curl https://<домен>/api/ping` → `{"status":"ok",…}`.

**GitHub на сервере по SSH.** Чтобы не вводить токен в `git pull`, добавьте deploy key только на чтение:

```bash
ssh-keygen -t ed25519 -C "server-deploy" -f ~/.ssh/github -N ""
cat ~/.ssh/github.pub   # GitHub → Settings → Deploy keys → Add, без «Allow write access»
printf 'Host github.com\n  IdentityFile ~/.ssh/github\n  IdentitiesOnly yes\n' >> ~/.ssh/config
ssh -T git@github.com
cd /opt/app/source && git remote set-url origin git@github.com:42team-ru/project_template.git
```

---

## Как поднять проект на новом сервере

### Вариант А: сборка на сервере

Нужны Docker и git.

```bash
git clone git@github.com:42team-ru/project_template.git && cd project_template
cat > .env <<'EOF'
PORT=80
HTTPS_PORT=443
DOMAIN=:80                         # или ваш домен для HTTPS
DB_PASSWORD=<пароль>
JWT_SECRET=<случайная строка не короче 32 символов>
S3_SECRET_KEY=<пароль MinIO от 8 символов>
DEMO_MODE=false
CORS_ORIGINS=https://<домен>
VITE_2GIS_KEY=<ключ>
EOF
docker compose up -d --build
```

Обновление: `git pull && docker compose up -d --build`. На машине с 2 ГБ памяти сборка может не
поместиться — добавьте swap или используйте вариант Б. Сертификаты лежат в `./data/caddy`, не удаляйте
эту папку.

Корневой compose по умолчанию в демо-режиме и с открытым CORS: для реальных пользователей обязательно
`DEMO_MODE=false`, свой `JWT_SECRET` и `CORS_ORIGINS`.

### Вариант Б: готовые образы из GHCR

```bash
mkdir -p /opt/app && cd /opt/app
# положить сюда deploy/docker-compose.yml как docker-compose.yml
echo "<токен GitHub с read:packages>" | docker login ghcr.io -u <логин> --password-stdin
cat > .env <<'EOF'
IMAGE=ghcr.io/42team-ru/project_template
TAG=latest
DB_PASSWORD=<пароль>
JWT_SECRET=<случайная строка не короче 32 символов>
S3_SECRET_KEY=<пароль MinIO>
DOMAIN=:80
DEMO_MODE=false
EOF
docker compose pull && docker compose up -d --wait
```

Обновление: `docker compose pull && docker compose up -d --wait`.

---

## Как поменять сервер для GitHub Actions

1. Подготовить сервер:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER          # выйти и зайти по SSH заново
   sudo mkdir -p /opt/app && sudo chown $USER /opt/app
   printf "DB_PASSWORD=$(openssl rand -hex 16)\nS3_SECRET_KEY=$(openssl rand -hex 24)\nDOMAIN=:80\n" > /opt/app/.env
   ```
   Открыть во внешнем файрволе TCP 22, 80, 443. `scripts/server-setup.sh` делает то же для `root`.
2. Обновить секреты:
   ```bash
   gh secret set VPS_HOST --body "1.2.3.4"
   gh secret set VPS_USER --body "ubuntu"
   gh secret set VPS_SSH_KEY < ~/.ssh/<ключ>
   ```
3. Запустить: `gh workflow run "CI/CD" && gh run watch`. Первый деплой поднимет всё с пустой базой.
4. Перенести данные, если нужно, и направить домен на новый IP.

---

## Как откатиться на прошлую версию

Каждый деплой из CI публикует образы с тегом `latest` и с полным sha коммита:

```bash
cd /opt/app
sed -i '/^TAG=/d' .env && echo "TAG=<полный sha>" >> .env
docker compose pull && docker compose up -d --wait
```

- Миграции назад не откатываются. Если новая версия уже поменяла схему, старый код может не подняться —
  откатывайтесь вместе с базой из резервной копии.
- Насовсем: `git revert <коммит>` и push.

При сборке на сервере (`make prod`) откат — `git checkout <коммит>` в `/opt/app/source` и
`docker compose up -d --build`.

---

## Как включить или выключить демо-режим

```bash
sed -i '/^DEMO_MODE=/d' .env && echo "DEMO_MODE=true" >> .env    # false — выключить
docker compose up -d
```

Демо создаёт аккаунты с публичным паролем `demo-password-1` и кнопки быстрого входа. На сервере с
реальными пользователями режим выключен. После выключения кнопки пропадают, а аккаунты остаются в базе —
для реального окружения удалите их из `users`. Демо создаётся только на пустой базе.

---

## Как подключить домен и HTTPS

1. У регистратора — A-записи `@` и `www` на IP сервера, других A-записей быть не должно.
   Проверка: `dig +short <домен>`.
2. Открыты порты 80 и 443.
3. На сервере:
   ```bash
   sed -i '/^DOMAIN=/d' .env && echo "DOMAIN=<домен>, www.<домен>" >> .env
   docker compose up -d
   docker compose logs -f web    # ждём "certificate obtained successfully"
   ```

Не прописывайте домен, пока DNS не указывает на сервер: у Let's Encrypt около 5 неудачных попыток в час
на имя.

---

## Логи, статус, перезапуск

```bash
docker compose ps                  # app должен быть healthy
docker compose logs -f app         # бэкенд; web — Caddy, db — Postgres
docker compose restart app
docker compose up -d               # применить изменения .env
curl localhost/api/ping
```

С вашего компьютера при заданном `VPS_HOST`: `make logs`.

---

## Как перенести базу на другой сервер

На старом:

```bash
docker compose exec -T db pg_dump -U app --clean --if-exists app > backup.sql
tar czf files.tgz data/minio       # файлы S3
```

На новом, до первого запуска приложения:

```bash
docker compose up -d db
docker compose exec -T db psql -U app -d app < backup.sql
docker compose up -d --wait
```

Перед важным показом делайте `pg_dump` заранее. Volume `pgdata` удаляется только `docker compose down -v`
или `docker volume rm`.

---

## Переменные .env на сервере

Полный список с дефолтами: [CONFIG.md](CONFIG.md).

| Переменная                                                | Для чего                                                          | Кто задаёт   |
|-----------------------------------------------------------|-------------------------------------------------------------------|--------------|
| `DB_PASSWORD`                                             | пароль Postgres                                                   | вы           |
| `JWT_SECRET`                                              | подпись токенов, не короче 32 символов; смена разлогинит всех     | CI, если нет |
| `S3_SECRET_KEY`                                           | пароль MinIO; после первого запуска не менять                     | CI, если нет |
| `DOMAIN`                                                  | `:80` или домены для HTTPS                                        | вы           |
| `DEMO_MODE`                                               | демо-аккаунты, по умолчанию `false`                               | вы           |
| `IMAGE`, `TAG`                                            | какие образы запускать (вариант Б)                                | CI           |
| `APP_PUBLIC_URL`                                          | адрес сайта для ссылок в уведомлениях                             | вы           |
| `VITE_2GIS_KEY`                                           | карта, подсказки адресов, маршруты; нужен при сборке фронта       | вы           |
| `TELEGRAM_*`                                              | бот уведомлений ([notifications.md](notifications.md#5-telegram)) | вы           |
| `MODERATION_LLM_ENABLED`, `MODERATION_CLASSIFIER_ENABLED` | модели модерации, по умолчанию `true`                             | вы           |

---

## Частые ошибки

| Симптом                                                      | Причина и решение                                                                                                      |
|--------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| Деплой красный на **SSH setup**                              | неверные `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`; проверка: `ssh -i <ключ> <user>@<host> echo ok`                        |
| `permission denied ... docker.sock`                          | пользователя нет в группе docker: `sudo usermod -aG docker $USER` и заново зайти по SSH                                |
| `pull access denied`                                         | нет логина в GHCR или у токена нет `read:packages`                                                                     |
| Деплой красный на `--wait`                                   | `app` не стал healthy: `docker compose logs app` — часто короткий `JWT_SECRET` или неверный пароль базы                |
| Снаружи не открывается, а `curl localhost/api/ping` работает | закрыты 80/443 во внешнем файрволе                                                                                     |
| Сертификат не выпускается                                    | DNS ещё не на сервере, закрыт порт или исчерпан лимит Let's Encrypt; `docker compose logs web`                         |
| `Migration checksum mismatch` локально                       | в базе старая версия применённой миграции; пересоздать: `docker compose -f docker-compose.dev.yml down -v && make dev` |
| `type "geometry" does not exist`                             | база запущена из образа `postgres`, а нужен `postgis/postgis`: `docker compose pull db && docker compose up -d db`     |
| `port is already allocated`                                  | порт занят; локально база на 5440, MinIO 9440/9441, бэкенд 8080, фронт 5173                                            |
| Демо не появилось после перезапуска                          | в базе уже есть `admin` — сид не запускается; стереть базу и перезапустить                                             |
