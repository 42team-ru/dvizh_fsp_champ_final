# Виды спорта в админке

Экран `/admin/sports` (ADMIN): справочник видов, PNG-картинки, модерация видов, которые ввели пользователи, слияние дублей.
Макет: Figma, «Админка — Виды спорта» и «Админка — Добавить вид спорта (диалог)».

## Статусы (`Sport.catalogStatus`, `SportStatus`)

| Статус | Что значит |
|---|---|
| `ACTIVE` | Вид из справочника или одобренный админом |
| `PENDING` | Свой вид пользователя (создаётся при создании мероприятия): им уже можно пользоваться, админ ещё не проверил |
| `HIDDEN` | Отключён админом: нет в `sports_search`, новое мероприятие с ним создать нельзя (400), старые остаются |
| `MERGED` | Объединён с другим видом (`mergedIntoId`): мероприятия, интересы людей, анкеты организаций и «Не интересно» уже перенесены |

Новый вид, который админ добавляет сам, сразу `ACTIVE`; с `published=false` — черновик `HIDDEN`.
Создание мероприятия с именем скрытого вида — 400, с именем слитого — используется целевой вид.

## Картинка

Загружается PNG (формат проверяется по сигнатуре): квадрат от 256×256, до 2 МБ. Файл — `files` с `kind = SPORT_IMAGE`,
`Sport.imageFileId`, точка фокуса (голова персонажа, % ширины и высоты) — `imageFocusX/Y`. `SportResponse.imageUrl` у такого вида —
`/api/files/{id}`, у остальных — встроенная иллюстрация `sport-images/<slug>.webp` или общая заглушка. Замена и удаление
удаляют прежний файл; после удаления вид возвращается к встроенной иллюстрации.

## API (тег `admin`, только ADMIN)

| operationId | Метод |
|---|---|
| `admin_listSports` | `GET /api/admin/sports?status=&withoutImage=&searchText=&page=&size=` — `status` можно повторять |
| `admin_sportCounts` | `GET /api/admin/sports/counts` — счётчики вкладок |
| `admin_createSport` | `POST /api/admin/sports?name=&focusX=&focusY=&published=` multipart `file?` |
| `admin_renameSport` | `PUT /api/admin/sports/{id}` |
| `admin_replaceSportImage` / `admin_removeSportImage` | `PUT` / `DELETE /api/admin/sports/{id}/image` |
| `admin_approveSport` | `POST …/{id}/approve` — только `PENDING` |
| `admin_hideSport` / `admin_restoreSport` | `POST …/{id}/hide` с причиной / `…/restore` |
| `admin_mergeSport` | `POST …/{id}/merge` `{targetId, reason?}` |
| `admin_deleteSport` | `DELETE …/{id}` — 409, если на вид есть ссылки (мероприятия, интересы, анкеты, слитые виды) |

Список режется в памяти (видов десятки), поэтому фильтр «без картинки» учитывает и встроенные иллюстрации.
Миграция `V35__sport_moderation.sql`: у уже созданных пользователями видов статус `PENDING`.
