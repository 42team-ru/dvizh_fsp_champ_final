# API

Все ручки под `/api`, ответы — JSON (исключение — календарь `.ics`). Интерактивная версия:
<http://localhost:8080/swagger-ui.html>, схема — <http://localhost:8080/v3/api-docs>.
Клиент для фронта генерирует Orval из той же схемы: [orval.md](orval.md).

**Сессия.** Вход ставит две HttpOnly cookie: `access_token` (JWT, 15 минут) и `refresh_token`
(14 дней, ротируется при каждом обновлении). Для скриптов подходит и заголовок
`Authorization: Bearer <jwt>`.

**Без входа доступны** `/api/auth/register`, `/login`, `/refresh`, `/logout`, проверка занятости
логина и почты, `/api/demo/**`, картинки видов спорта и достижений, `/actuator/health`, Swagger.
Всё остальное требует входа; `/api/admin/**` — ещё и роль `ADMIN`. Остальные права (организатор,
участник, статус допуска клуба) проверяют сервисы, а не фильтр безопасности.

**Пагинация.** Списки отдают `PageResponse`: `items`, `page`, `size`, `totalElements`, `totalPages`.
Параметры `page` (с нуля) и `size` (до 100).

---

## 1. Вход

| Метод | Путь                                                    | Описание                                                                                                       |
|-------|---------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| POST  | `/auth/register`                                        | Регистрация: `{username, email, firstName, lastName, password, accountType}`, `accountType` — `USER` или `ORG` |
| POST  | `/auth/login`                                           | Вход: `{username, password}`                                                                                   |
| POST  | `/auth/refresh`                                         | Новая пара cookie по `refresh_token`                                                                           |
| POST  | `/auth/logout`                                          | Выход, refresh-токен отзывается                                                                                |
| GET   | `/auth/me`                                              | Текущий пользователь и его роль                                                                                |
| GET   | `/auth/users/check/username`, `/auth/users/check/email` | Свободен ли логин или почта                                                                                    |
| GET   | `/demo/accounts`                                        | Демо-аккаунты для кнопок входа. Только при `DEMO_MODE=true`, иначе пустой список                               |

Администратор через API не создаётся.

---

## 2. Мероприятия

| Метод       | Путь                                                    | Описание                                                                                                                                    |
|-------------|---------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| GET         | `/events`                                               | Лента. Фильтры: `searchText`, `sportId`, `from`, `to`, `level`, `joinMode`, `format`, `organizationId`, `forMe`, `lat` + `lon` + `radiusKm` |
| GET         | `/events/map`                                           | GeoJSON `FeatureCollection` по видимой области `minLon, minLat, maxLon, maxLat`; фильтры как у ленты                                        |
| GET         | `/events/{id}`                                          | Карточка с блоком `viewer`                                                                                                                  |
| POST        | `/events`                                               | Создать                                                                                                                                     |
| PUT         | `/events/{id}`                                          | Изменить (организатор)                                                                                                                      |
| GET         | `/events/create-permission`                             | `{canCreate, reason}` — для неактивной кнопки «Создать»                                                                                     |
| GET         | `/events/mine`                                          | Где я автор или соорганизатор; `when=UPCOMING\|PAST`, `status`, `searchText`                                                                |
| GET         | `/events/{id}/similar`                                  | Похожие встречи                                                                                                                             |
| GET         | `/events/{id}/calendar.ics`                             | Файл для календаря                                                                                                                          |
| PUT, DELETE | `/events/{id}/announcement`                             | Объявление участникам: закрепляется в карточке и приходит уведомлением                                                                      |
| POST        | `/events/{id}/photos`                                   | Фото, multipart `file` + необязательные `focusX`, `focusY` (0–100)                                                                          |
| PUT         | `/events/{id}/photos/{fileId}/focus`                    | Точка фокуса: вокруг неё обрезаются превью                                                                                                  |
| DELETE      | `/events/{id}/photos/{fileId}`                          | Удалить фото                                                                                                                                |
| POST        | `/events/{id}/organizers`                               | Пригласить соорганизатора по логину                                                                                                         |
| DELETE      | `/events/{id}/organizers/{userId}`                      | Убрать соорганизатора или отозвать приглашение                                                                                              |
| GET         | `/events/organizer-invitations`                         | Мои приглашения без ответа                                                                                                                  |
| POST        | `/events/{id}/organizers/invitation/accept`, `/decline` | Ответ на приглашение                                                                                                                        |

**Свой вид спорта.** В `EventRequest` передаётся либо `sportId`, либо `sportName`. Название
нормализуется (регистр, пробелы, ё → е) и ищется в справочнике; если такого нет, вид создаётся
в той же транзакции.

**Очная встреча** требует `address`, `lat` и `lon`. **Онлайн** — `onlineUrl`, координаты не хранятся.
`onlineUrl` и `privateDetails` видят только подтверждённые участники и организаторы.

**Серия** — тот же `EventRequest` с блоком `schedule`: часовой пояс, границы серии (не длиннее года)
и 1–10 правил RRULE. Занятия хранятся отдельно, см. раздел 4.

### Блок `viewer`

Фронт не дублирует правила доступа, а рисует кнопки по `viewer`:

```json
{
  "registrationStatus": "PENDING",
  "canRegister": false,
  "registerBlockedReason": "Заявка уже подана",
  "isOrganizer": false,
  "canManage": false,
  "canManageOrganizers": false,
  "canCancel": true,
  "canSeePrivateDetails": false,
  "canComment": true,
  "joinAs": "PENDING",
  "waitlistPosition": null,
  "decisionReason": null,
  "organizerInvite": null
}
```

`joinAs` — какой статус получит человек, если нажмёт «Записаться»: `CONFIRMED`, `PENDING`
или `WAITLISTED`. Считается тем же классом `EventAccessPolicy`, что и проверка самой записи.

---

## 3. Записи и заявки

| Метод  | Путь                            | Описание                                             |
|--------|---------------------------------|------------------------------------------------------|
| POST   | `/events/{id}/registrations`    | Записаться: `{message?}` — сопроводительное к заявке |
| DELETE | `/events/{id}/registrations/me` | Отменить свою запись                                 |
| GET    | `/events/{id}/registrations`    | Участники и заявки (организатор)                     |
| POST   | `/registrations/{id}/approve`   | Принять заявку                                       |
| POST   | `/registrations/{id}/reject`    | Отклонить: `{reason}`                                |
| GET    | `/registrations/mine`           | Мои записи; `status`, `when=UPCOMING\|PAST`          |

Итог записи зависит от режима:

| Режим     | Места есть                        | Мест нет                                                                   |
|-----------|-----------------------------------|----------------------------------------------------------------------------|
| `FREE`    | `CONFIRMED`                       | `WAITLISTED`, первый в очереди подтверждается сам, когда место освободится |
| `REQUEST` | `PENDING` до решения организатора | `409 «Мест нет»`                                                           |

Запись и одобрение идут под блокировкой строки мероприятия: два человека не займут последнее место.
Повторная запись после отмены переиспользует ту же строку, дубля не будет.

`POST /events/{id}/registrations` → `200`:

```json
{
  "id": "6c0e…",
  "eventId": "1f9a…",
  "userId": "b2d4…",
  "status": "PENDING",
  "message": "Играю с дедушкой, хочу попробовать турнир",
  "decisionReason": null,
  "decidedAt": null,
  "decidedById": null,
  "createdAt": "2026-10-20T08:12:44Z"
}
```

---

## 4. Занятия серии

| Метод        | Путь                                                 | Описание                                             |
|--------------|------------------------------------------------------|------------------------------------------------------|
| GET          | `/events/{id}/occurrences?from=&to=`                 | Занятия в периоде                                    |
| POST         | `/events/{id}/occurrences`                           | Добавить разовую дату (в будущем и в границах серии) |
| PUT          | `/events/{id}/occurrences/{occurrenceId}`            | Перенести, отметки сохраняются                       |
| POST         | `/events/{id}/occurrences/{occurrenceId}/cancel`     | Отменить с причиной; работает и для разовой встречи  |
| POST         | `/events/{id}/occurrences/{occurrenceId}/confirm`    | «Состоится» — подтверждение кворума организатором    |
| POST, DELETE | `/events/{id}/occurrences/{occurrenceId}/attendance` | Отметиться «приду» и снять отметку                   |
| GET          | `/events/{id}/occurrences/{occurrenceId}/attendees`  | Кто придёт (организатор)                             |

Запись на серию — это вступление в неё. Лимит мест считается на каждое занятие, а не на серию.
Кворум (`minParticipants`) тоже считается на занятие: у серии — по отметкам, у разовой встречи — по
подтверждённым записям.

---

## 5. Обсуждение

| Метод  | Путь                                | Описание                                                  |
|--------|-------------------------------------|-----------------------------------------------------------|
| GET    | `/events/{id}/comments?after=`      | Сообщения по порядку; `after` — только новые и изменённые |
| POST   | `/events/{id}/comments`             | `{text, replyToId?}` — сообщение или ответ с цитатой      |
| PUT    | `/events/{id}/comments/{commentId}` | Исправить своё                                            |
| DELETE | `/events/{id}/comments/{commentId}` | Удалить своё; в потоке остаётся заглушка                  |

В ответе у сообщения: автор, `isOrganizer`, `organization` (если писал аккаунт клуба), `replyTo`,
`repliesCount`, `isMine`, `canEdit`, `hidden`, `hiddenReason`. Текст скрытого сообщения видит только
администратор, причину — автор.

---

## 6. Организации

| Метод        | Путь                                                   | Описание                                                                   |
|--------------|--------------------------------------------------------|----------------------------------------------------------------------------|
| GET          | `/organizations/me`                                    | Своя анкета со статусом допуска (только аккаунт `ORG`, без анкеты — `404`) |
| PUT          | `/organizations/me`                                    | Сохранить анкету. Это и есть заявка, отдельной кнопки «отправить» нет      |
| PUT, DELETE  | `/organizations/me/logo`                               | Логотип                                                                    |
| POST         | `/organizations/me/documents`                          | Документ для проверки (PDF, JPG, PNG до 10 МБ)                             |
| GET          | `/organizations`                                       | Каталог допущенных организаций                                             |
| GET          | `/organizations/{id}`                                  | Публичная страница; не допущена — `404`                                    |
| GET          | `/organizations/{id}/overview`, `/meetings`, `/photos` | Сводка, архив встреч, фото                                                 |
| POST, DELETE | `/organizations/{id}/subscription`                     | Подписка на новые встречи клуба                                            |
| GET          | `/organizations/featured`                              | «Организация месяца» или пустой ответ                                      |

Статусы анкеты: `PENDING` → `APPROVED`, `REJECTED` или `REVISION` (возврат на доработку).
Первая анкета и правка после отказа или доработки уходят в `PENDING`; правка допущенной анкеты
статус не меняет. Публиковать встречи может только `APPROVED`.

---

## 7. Пользователи

| Метод             | Путь                                            | Описание                                                                 |
|-------------------|-------------------------------------------------|--------------------------------------------------------------------------|
| GET               | `/users/{id}`                                   | Публичный профиль: виды спорта, сколько встреч провёл и посетил, галерея |
| PUT               | `/users/me`                                     | Имя, город, «о себе»                                                     |
| PUT, DELETE       | `/users/me/avatar`                              | Аватар                                                                   |
| GET, PUT          | `/users/me/sports`                              | Виды спорта и уровень в каждом                                           |
| GET, PUT          | `/users/me/preferences`                         | Онбординг: уровень, дни, время суток, радиус, домашняя точка             |
| GET, POST, DELETE | `/users/me/photos`                              | Личная галерея, до 6 фото                                                |
| GET               | `/users/{id}/album`, `/users/{id}/album/events` | Альбом фото по прошедшим встречам                                        |
| POST, PUT, DELETE | `/users/me/album`                               | Добавить фото с встречи, подписать, удалить                              |
| GET               | `/users/me/history`, `/history/summary`         | История посещений                                                        |
| GET               | `/users/me/wallet`, `/achievements`             | Монеты, уровень, достижения                                              |
| GET               | `/users/me/leave-tip`                           | «Когда выходить» на ближайшую встречу                                    |

Бобр-питомец и магазин — раздел `pets` в Swagger, подробнее
в [beaver-backend-integration.md](beaver-backend-integration.md).

---

## 8. Подборка, блог, уведомления

| Раздел      | Ручки                                                                                                                           | Подробнее                                |
|-------------|---------------------------------------------------------------------------------------------------------------------------------|------------------------------------------|
| Подборка    | `GET /recommendations/events`, `/events/{id}/explain`, `POST/DELETE /events/{id}/dismiss`, `GET /recommendations/organizations` | [recommendations.md](recommendations.md) |
| Блог        | `GET/POST /blog/posts`, `GET/PUT/DELETE /blog/posts/{id}`, лайки, комментарии, `POST /blog/photos`, `GET /blog/prompt`          | Swagger, тег `blog`                      |
| Уведомления | `GET /notifications`, `/unread-counts`, `/poll` (long polling), настройки, Telegram                                             | [notifications.md](notifications.md)     |

---

## 9. Администратор (`ADMIN`)

| Метод     | Путь                                                                    | Описание                                                                 |
|-----------|-------------------------------------------------------------------------|--------------------------------------------------------------------------|
| GET       | `/admin/stats?days=`                                                    | Счётчики и «сколько присоединилось по дням»                              |
| GET       | `/admin/users`                                                          | Поиск пользователей                                                      |
| GET       | `/admin/organizations?status=&searchText=`                              | Заявки и организации                                                     |
| GET       | `/admin/organizations/{id}`                                             | Анкета с аккаунтом заявителя и документами                               |
| POST      | `/admin/organizations/{id}/approve`                                     | Одобрить                                                                 |
| POST      | `/admin/organizations/{id}/reject`, `/return`                           | Отклонить или вернуть на доработку, `{reason}` обязателен                |
| GET       | `/admin/events?searchText=&status=`                                     | Мероприятия во всех статусах                                             |
| POST      | `/admin/events/{id}/unpublish`                                          | Снять с публикации с причиной                                            |
| DELETE    | `/admin/events/{id}`                                                    | Удалить с причиной (мягко: записи остаются)                              |
| POST      | `/admin/events/{id}/restore`                                            | Вернуть снятое                                                           |
| POST      | `/admin/comments/{id}/hide`, `/unhide`                                  | Скрыть сообщение с причиной и вернуть                                    |
| GET       | `/admin/moderation?status=&targetType=`                                 | Очередь модерации                                                        |
| POST      | `/admin/moderation/{id}/approve`, `/hide`, `/clear-profile`, `/recheck` | Решения по очереди                                                       |
| GET, POST | `/admin/sports…`                                                        | Справочник видов спорта: одобрение своих видов, слияние дублей, картинки |
| GET       | `/admin/awards?month=`                                                  | «Организация месяца»: кандидаты и счёт                                   |
| POST      | `/admin/awards/{id}/confirm`                                            | Подтвердить награду                                                      |

Администратор не создаёт мероприятия и не решает заявки участников: такие запросы отвечают `403`.

---

## 10. Ошибки

Единый формат — RFC 9457 `ProblemDetail`. Поле `detail` написано по-русски для человека, фронт
показывает его как есть:

```json
{
  "type": "about:blank",
  "title": "Conflict",
  "status": 409,
  "detail": "Запись закрыта: мероприятие снято с публикации",
  "instance": "/api/events/1f9a…/registrations"
}
```

| HTTP | Когда                                              | Пример `detail`                                                                                                      |
|------|----------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| 400  | не прошла валидация, мат в тексте, неверные данные | «Начало должно быть в будущем»                                                                                       |
| 401  | нет входа или сессия истекла                       | «Сессия недействительна, войдите заново»                                                                             |
| 403  | нет прав на действие                               | «Решение по заявке принимает только организатор»                                                                     |
| 404  | объекта нет или он скрыт от вас                    | «Заявка не найдена»                                                                                                  |
| 409  | действие противоречит состоянию                    | «Мест нет», «Организатор не может записаться на своё мероприятие», «Запись закрыта: организатор отменил мероприятие» |
| 503  | недоступен внешний сервис (2ГИС, модерация)        | —                                                                                                                    |
