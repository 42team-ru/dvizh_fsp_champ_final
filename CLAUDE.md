# CLAUDE.md

Общий контекст проекта для агентов и для обоих разработчиков. Читать перед любой задачей. Задачи каждого лежат в `TASKS_VASYA.md` и `TASKS_MAXIM.md`.

## Продукт

Платформа совместных спортивных активностей: финал Чемпионата России по продуктовому программированию, кейс Столото. Адаптивное веб-приложение помогает перейти от «хочу заниматься спортом, но не с кем» к конкретной встрече: кто собирается, где, когда и как присоединиться.

- Это не соцсеть, не система соревнований и не игра.
- Логика универсальная: футбол, шахматы, бег, зарядка во дворе и любой нишевый вид укладываются в одну модель. Новый вид спорта не требует правки кода.
- Аудитория разная, в том числе старшее поколение: крупный читаемый текст, ясные кнопки, заметные статусы, минимум шагов. Mobile-first, но работает и на компьютере.
- Внутренних чатов нет: общение в комментариях под событием, живое общение — по ссылкам на внешние мессенджеры.

**Главный приоритет.** Эксперты руками проверяют шесть сценариев (раздел «Сценарии приёмки») в задеплоенном прототипе. Пока они не проходят, доп. фичи не начинаем.

## Стек и запуск

Java 25, Spring Boot 4.1 (Gradle Kotlin DSL), PostgreSQL 18, Flyway, Spring Security с JWT в HttpOnly cookie, springdoc. Фронт: React Router 7 (SPA, `ssr: false`), Vite, Tailwind 4, shadcn/ui, TanStack Query и Form, zod, zustand, Orval. Caddy, Docker, GitHub Actions → GHCR → VPS.

```bash
make dev      # Postgres :5440 (один раз)
make back     # бэкенд :8080, Swagger /swagger-ui.html
make front    # фронт  :5173, /api проксируется на бэк
docker compose up --build   # всё одной командой, как у жюри: http://localhost:8080, DEMO_MODE=true
cd backend && ./gradlew test          # быстрые тесты на H2
cd backend && ./gradlew postgresTest  # смоук миграций на настоящем Postgres (нужен Docker)
```

Подробно: `docs/development.md`, `docs/deploy.md`, `docs/dev-faq.md`.

## Роли и аккаунты

| Роль | Кто | Что может |
|---|---|---|
| USER | Отдельный человек | Ищет события, записывается, комментирует, создаёт свои события и управляет записью на них |
| ORG | Аккаунт клуба, кружка, федерации, компании | Заполняет анкету и подаёт заявку на допуск. После одобрения: публичная страница, публикация событий без повторной модерации, управление записью, ответы в обсуждениях |
| ADMIN | Администратор платформы | Одобряет или отклоняет организации, снимает с публикации или удаляет события, ищет и просматривает данные |

- Организатор события не отдельная роль: им выступает USER или ORG.
- Реализация: в `AppUser.SystemRole` добавляется `ORG` (`USER | ORG | ADMIN`). Роль попадает в JWT-клейм `role` и становится `ROLE_<роль>`.
- Регистрация: в `RegisterRequest` добавляется тип аккаунта `USER | ORG`, по умолчанию `USER`. ADMIN через API не создаётся.
- Статус допуска организации всегда читаем из БД, а не из токена.
- Вход настоящий (`AuthController`): логин и пароль, cookie `access_token` (15 минут) и `refresh_token` (14 дней). В демо-режиме страница входа показывает кнопки демо-аккаунтов, которые подставляют логин и пароль в обычную форму.

## Модель данных

Стиль новых сущностей (образец: `Event`, `Registration`, `Sport`; `AppUser` и `RefreshToken` из шаблона остаются как есть):
- первичный ключ `UUID`, генерирует Hibernate: `@GeneratedValue(strategy = GenerationType.UUID)`;
- `createdAt`/`updatedAt` — в базовом `domain.entity.AuditEntity` (`@MappedSuperclass`, `@CreationTimestamp`/`@UpdateTimestamp`), сущность от него наследуется; время — `Instant`;
- текущее время для бизнес-проверок («уже началось», `decidedAt`) — у базы: `DbTimeRepository.now()`, а не `Clock`;
- `@Table` только с `name`; уникальность и индексы — в миграциях;
- над каждым полем и значением enum — однострочный Javadoc, что это;
- enum хранится как `varchar` с `@Enumerated(STRING)`;
- Lombok `@Getter @Setter @NoArgsConstructor`;
- внешние ключи — поля `UUID` (как `RefreshToken.userId`); `@ManyToOne` только если реально упрощает.

| Сущность | Поля |
|---|---|
| `AppUser` (`users`) | есть в шаблоне; добавить `bio?`, `avatarUrl?`, `city?` |
| `Sport` | `id`, `name`, `normalizedName` (unique), `slug`, `custom` (boolean), `createdById?`, `createdAt` |
| `UserPreferences` | `id`, `userId` (unique), `level` (`SportLevel`), `days` (`DayOfWeek`, отдельная таблица `user_preference_days`), `daytime` (`MORNING \| DAY \| EVENING`), `radiusKm` (1–20), `reminders`, `nearby`, `cheer`, `homeLat?`/`homeLon?` (домашняя точка, обе или ни одной), аудит |
| `UserSport` | `userId`, `sportId`, `level?` (`BEGINNER \| AMATEUR \| PRO`) |
| `Organization` | `id`, `accountId` (unique, аккаунт роли ORG), `name`, `description`, `city?`, `contacts` (`Map<ContactType, String>`, таблица `organization_contacts`; `ContactType = PHONE \| EMAIL \| TELEGRAM \| VK \| WHATSAPP \| MAX \| WEBSITE`, минимум один, формат проверяет сервис), `status` (`PENDING \| APPROVED \| REJECTED \| REVISION`), `rejectReason?` (причина отказа или возврата на доработку), `submittedAt`, `reviewedAt?`, `reviewedById?`, `logoFileId?` |
| `OrganizationSport` (`organization_sports`) | `id`, `organizationId`, `sportId`, unique (`organizationId`, `sportId`) — спортивные интересы организации, в анкете 1–10 |
| `Event` | `id`, `title`, `description`, `sportId`, `authorId`, `organizationId?` (если создано от организации), `startAt`, `endAt?`, `format` (`OFFLINE \| ONLINE`), `address?`, `locationNote?`, `onlineUrl?`, `lat?`, `lon?` (обязательны для OFFLINE, у ONLINE не хранятся; рядом в БД вычисляемая PostGIS-точка `location`), `level` (`ANY \| BEGINNER \| AMATEUR \| PRO`), `kind?` (тренировка, игра, встреча, любительский турнир), `requirements?`, `equipment?`, `capacity?`, `joinMode` (`FREE \| REQUEST`), `privateDetails?`, `status` (`PUBLISHED \| UNPUBLISHED \| DELETED`), `moderationReason?`, `moderatedAt?`, `moderatedById?`, `announcement?`, `announcedAt?` (объявление организатора), `createdAt`, `updatedAt` |
| `Event` (кворум) | + `minParticipants?` — «состоится, если наберём N», не больше `capacity` |
| `Event` (серия) | + `recurring`, `timeZone` (IANA), `seriesStartDate`, `seriesEndDate`; у серии `startAt/endAt` — первое занятие, `capacity` — на каждое занятие |
| `EventScheduleRule` (`event_schedule_rules`) | `id`, `eventId`, `sortOrder`, `firstStart` (`LocalDateTime`, местное время серии = DTSTART), `durationMinutes`, `rrule` (RFC 5545, без `RRULE:`) |
| `EventOccurrence` (`event_occurrences`) | `id`, `eventId`, `startAt`, `endAt?`, `originalStartAt?` (время по правилу, ключ при пересчёте), `source` (`SINGLE \| RULE \| EXTRA`), `status` (`SCHEDULED \| CANCELLED`), `cancelReason?`, `cancelledAt?`, `cancelledById?`, `confirmedAt?`, `confirmedById?` (организатор подтвердил «Состоится»); unique (`eventId`, `originalStartAt`). У разового — одно занятие `SINGLE` |
| `OccurrenceAttendance` (`occurrence_attendances`) | `id`, `occurrenceId`, `eventId`, `userId`; unique (`occurrenceId`, `userId`) — отметка «приду» участника серии |
| `EventOrganizer` (`event_organizers`) | `id`, `eventId`, `userId`, `addedById`, unique (`eventId`, `userId`) — соорганизаторы: правят событие и решают заявки наравне с автором, состав меняет только автор |
| `Registration` | `id`, `eventId`, `userId`, unique (`eventId`, `userId`), `status` (`CONFIRMED \| PENDING \| REJECTED \| CANCELLED \| WAITLISTED`), `message?` (сопроводительное к заявке), `decisionReason?`, `decidedAt?`, `decidedById?`, `queuedAt?` (порядок листа ожидания), `createdAt` |
| `RecommendationDismissal` (`recommendation_dismissals`) | `id`, `userId`, `eventId`, `sportId` (вид на момент скрытия), `reason` (`NOT_INTERESTED \| NOT_MY_SPORT \| TOO_FAR \| BAD_TIME`), аудит; unique (`userId`, `eventId`) — «Не интересно» в подборке |
| `Comment` | `id`, `eventId`, `authorId`, `text`, `parentId?` (ответ на сообщение), `editedAt?`, `deletedAt?` (мягкое удаление автором), `createdAt`, `hidden`, `hiddenAt?`, `hiddenById?`, `hideReason?` (скрыто админом) |

- Удаление событий мягкое (`status = DELETED`): записавшиеся видят, что произошло.
- Счётчик «записались 8 из 16» не храним: считаем подтверждённые записи одним запросом по списку `eventId`.
- `privateDetails` (точное место, ссылка на внешний чат) и `onlineUrl` видят только подтверждённые участники и организатор.
- Уровень: Любой, Новичок, Любитель, Профи (`ADVANCED` убран миграциями V21/V23).

## Личная галерея профиля

Галерея отделена от аватара: файлы `USER_PHOTO` в существующей таблице `files`, до 6 фото
JPG/PNG/WebP по 5 МБ. `GET /api/users/me/photos` (`users_myPhotos`) возвращает список;
`POST /api/users/me/photos` (`users_addPhoto`, multipart `file`) добавляет;
`DELETE /api/users/me/photos/{fileId}` (`users_removePhoto`) удаляет только своё фото галереи.
Изменения возвращают весь список по времени загрузки. Лимит защищён блокировкой пользователя.
`PublicUserResponse.photos` показывает галерею всем вошедшим; скачивание — существующий `/api/files/{id}`.
Чужой файл, аватар или неизвестный id при удалении → 404; без входа → 401.
Загрузка/удаление аватара не меняет галерею. Во фронте это вкладка «Обо мне» виджета `widgets/profile-gallery`.

**Альбом по занятиям** (виджет `widgets/profile-gallery`: «Папки», «Все фото», «Обо мне»; в своём и чужом профиле).
Фото — `files` с `kind = ALBUM_PHOTO`, `event_id` = папка, `caption` до 300 (V22). Логика — `AlbumService`.
`GET /api/users/{id}/album?eventId=&sportId=&sort=NEWEST|OLDEST&page=&size=` (`users_album`, `mine` у своих) ·
`GET /api/users/{id}/album/events` — папки, новые занятия сверху (`users_albumFolders`) ·
`GET /api/users/me/album/eligible-events` (`users_albumEligibleEvents`) ·
`POST /api/users/me/album?eventId=&caption=` multipart `file` (`users_addAlbumPhoto`) ·
`PUT /api/users/me/album/{fileId}` `{caption}` (`users_captionAlbumPhoto`) · `DELETE …/{fileId}` → 204 (`users_removeAlbumPhoto`).
Добавить можно с начавшегося не удалённого мероприятия, где ты организатор или CONFIRMED-участник (иначе 403; удалено/не началось/больше 200 фото → 409; без занятия → 400).
Демо: `DemoAlbumSeeder` загружает фото Анне и Петру через `AlbumService` (картинки видов спорта).

## Предпочтения онбординга

`GET /api/users/me/preferences` (`users_myPreferences`) и `PUT /api/users/me/preferences`
(`users_saveMyPreferences`) доступны вошедшему владельцу профиля любой роли. PUT заменяет настройки
целиком: `level`, непустой список `days`, `daytime`, целое `radiusKm` (1–20),
`helpers: {reminders, nearby, cheer}`; все поля обязательны, включая false у помощников.
Дни — MONDAY–SUNDAY; повторы схлопываются, ответ отсортирован с понедельника.
До первого сохранения GET не создаёт строку в БД и возвращает AMATEUR, TUESDAY/THURSDAY/SATURDAY,
EVENING, 5 км и helpers=true/true/false. Настройки приватные, в публичный профиль не входят.

Соответствия фронта: novice → BEGINNER, amateur → AMATEUR, pro → PRO; «Пн»–«Вс» → MONDAY–SUNDAY;
morning/day/evening → MORNING/DAY/EVENING; radius → radiusKm.
Общий уровень независим от UserSport: при подключении онбординга фронт передаёт выбранный уровень
каждому спорту через существующий PUT /api/users/me/sports. Сохранение предпочтений не меняет интересы.

Необязательная `home: {lat, lon}` — домашняя точка для подбора «рядом с домом»; не передана в PUT — очищается.

**Текущий объём:** хранение и контракт API. Экран онбординга ещё не подключён; ленту (`events_list`) расписание
и радиус не меняют, но их читает подборка `recommendations_*`; помощники не запускают уведомления или реакции.
Имя/наряд питомца и статус завершения онбординга этим API не управляются.

## Бизнес-правила (инварианты)

Каждое правило проверяется на сервере. Скрыть кнопку в UI недостаточно.

1. **Свой вид спорта.** В форме события выбирают вид из справочника или вводят свой. Сервер нормализует название (trim, схлопнуть пробелы, нижний регистр, ё → е), ищет `Sport` по `normalizedName` и при отсутствии создаёт новый с `custom = true` в той же транзакции.
2. **Публикация от организации** разрешена только при `Organization.status = APPROVED`. Для PENDING, REJECTED и REVISION API отвечает 403, в UI кнопка неактивна с пояснением из `GET /api/events/create-permission`. Повторной модерации событий одобренной организации нет: событие публикуется сразу. Если админ отозвал одобрение, события организации пропадают из ленты, карты и профиля, запись и управление ими закрыты (409); при повторном одобрении всё возвращается (`EventAccessPolicy.isOrganizationSuspended`).
3. **Публичная страница организации** (`GET /api/organizations/{id}`) отдаётся только при APPROVED, иначе 404.
3а. **Анкета организации.** Отдельного шага «отправить» нет: `PUT /api/organizations/me` и есть заявка. Первая анкета и правка после отказа или возврата на доработку → PENDING; правка PENDING или APPROVED статус не меняет. Админ может пересмотреть решение в любую сторону (одобрить отклонённую, отклонить одобренную) и вернуть заявку на проверке на доработку (REVISION); отказ и возврат всегда с причиной. В анкете нужен хотя бы один вид спорта. `/api/organizations/me` доступен только аккаунту ORG (иначе 403), без анкеты — 404.
4. **Запись на событие:**
    - событие должно быть PUBLISHED и не начавшимся, иначе 409;
    - FREE → запись сразу CONFIRMED, а если мест нет — WAITLISTED (лист ожидания, `WaitlistService`): освободилось место или увеличили лимит — первый в очереди становится CONFIRMED сам; REQUEST → PENDING;
    - участником записывается только USER: админ и аккаунт ORG — 409;
    - решение по заявке (CONFIRMED или REJECTED) принимает организатор: автор события или его соорганизатор (`EventOrganizer`); для события организации — ещё и аккаунт этой организации. Админ заявки участников не рассматривает и соорганизатором быть не может;
    - организатор не может записаться на своё событие (409);
    - повторная запись не создаёт дубль: строка `Registration` переиспользуется (после CANCELLED можно записаться снова);
    - если задан `capacity` и мест нет — у REQUEST 409 «Мест нет» (и при одобрении), у FREE — лист ожидания; одобрить после начала нельзя;
    - запись и одобрение заявки идут под блокировкой строки события (`@Lock(PESSIMISTIC_WRITE)` в `EventRepository`), чтобы два человека не заняли последнее место.
5. **Снятое или удалённое событие:**
    - пропадает из ленты и поиска;
    - по прямой ссылке открывается с красной плашкой «Снято с публикации» (или «Удалено») и причиной, кнопки записи нет, API записи отвечает 409;
    - записи остаются, а в «Моих записях» и у организатора показывается статус «Событие снято с публикации».
6. **Комментарии** может оставить любой вошедший пользователь, в том числе не записанный. Комментарий автора события получает метку «Организатор», а от аккаунта организации — ещё и её название (`organization`). Вопрос в общий поток уведомляет организаторов. Админ скрывает отдельное сообщение с причиной: в потоке остаётся заглушка, текст видит только админ, причину — автор; ответить на скрытое и исправить его нельзя.
7. **Админ** не создаёт события ни от своего, ни от чужого имени и не принимает решения по заявкам участников.
8. **Одна политика на команду и на кнопку.** Правила «можно ли записаться, отменить, управлять, видеть приватные детали» живут в одном классе в `service`, например `EventAccessPolicy`. Им пользуются и сервис для команд, и сборка ответа: карточка события приходит с блоком `viewer` (`registrationStatus`, `canRegister`, `registerBlockedReason`, `isOrganizer`, `canManage`, `canSeePrivateDetails`, `joinAs` — какой статус получу, `waitlistPosition`). Фронт рисует кнопки по `viewer` и не дублирует правила.

9. **Повторяющиеся мероприятия (серии).** Одно `Event` + правила RRULE (библиотека `lib-recur`, `ScheduleExpander`); занятия хранятся в `event_occurrences` и пересчитываются при сохранении (`OccurrenceService`).
    - Границы серии обязательны: не длиннее года, не больше 500 занятий, правил 1–10, FREQ не чаще DAILY; первое занятие правила — внутри границ; совпавшие по времени занятия схлопываются.
    - Лента, карта и профиль фильтруют по занятиям (`SCHEDULED` в периоде): серия — одна карточка со временем ближайшего подходящего занятия.
    - Запись = вступление в серию (FREE/REQUEST как обычно, лимита на вступление нет). Дальше участник сам отмечается на даты; `capacity` — на занятие. Вступить можно, пока есть будущее занятие; отметиться и снять отметку — до начала занятия. Выход или исключение снимают будущие отметки, прошлые остаются.
    - Организатор отменяет занятие (необратимо, отметки остаются), переносит (отметки сохраняются), добавляет разовую дату — в будущем и в границах серии.
    - Правка правил: прошлые занятия не трогаем; будущие с тем же исходным временем остаются; исчезнувшие с отметками → `CANCELLED` «Расписание изменено», без отметок — удаляются. Разовое ↔ серия при правке — 409.
    - Разовое событие: одно занятие, отметок нет, «кто придёт» = подтверждённые записи. Организатор может отменить его через отмену занятия: оно уходит из ленты, запись закрывается (409), у записавшихся — `cancelledByOrganizer` и причина.
10. **Кворум** (`minParticipants`). Считается на каждое занятие: у серии — по отметкам, у разового — по подтверждённым записям. Статус (`QuorumStatus`, не хранится): `GATHERING` → набрали N — `REACHED` («Состоится» сразу) или организатор нажал «Подтвердить» — `CONFIRMED` (можно и до набора, не снимается). Автоотмены и дедлайна нет: не набрали — организатор решает сам (подтвердить или отменить). Кворум > лимита мест — 400.

## API

Правила контроллеров из шаблона обязательны:
- только `/api/...`;
- `produces = APPLICATION_JSON_VALUE`;
- `@Tag` и `@Operation(operationId = "<tag>_<действие>")`;
- наружу только `dto`-records.

Текущий пользователь в контроллере — `@AuthenticationPrincipal Jwt jwt` → `UUID.fromString(jwt.getSubject())`. В сервис передаётся `UUID userId`, не `Jwt`.

| Тег | Эндпоинты (operationId) |
|---|---|
| `sports` | `GET /api/sports?query=` (`sports_search`) |
| `events` | `GET /api/events` с фильтрами `searchText` (название, описание, адрес, вид спорта, организация), `sportId, from, to, level, joinMode, format, organizationId` (для страницы организации), `forMe`, `lat, lon, radiusKm` (рядом, онлайн всегда), `page, size` (до 100) (`events_list`) · `GET /api/events/create-permission` — `{canCreate, reason}` (`events_createPermission`) · `GET /api/events/{id}/similar?limit=6` — похожие встречи (`events_similar`) · `PUT`/`DELETE /api/events/{id}/announcement` — объявление участникам (`events_announce`, `events_clearAnnouncement`) · `GET /api/events/{id}/calendar.ics` — `text/calendar`, исключение из правила JSON (`events_calendar`) · `GET /api/events/{id}` с блоком `viewer` (`events_get`) · `POST /api/events` (`events_create`) · `PUT /api/events/{id}` (`events_update`) · `GET /api/events/mine?status=&when=&searchText=&page=0&size=20` — `PageResponse<EventSummaryResponse>`, где я автор или соорганизатор; новые сверху, `when=UPCOMING|PAST` по наличию будущего SCHEDULED-занятия, size до 100 (`events_mine`) · `POST /api/events/{id}/organizers` (`events_addOrganizer`) · `DELETE /api/events/{id}/organizers/{userId}` (`events_removeOrganizer`) |
| `registrations` | `POST /api/events/{id}/registrations` (`registrations_create`) · `DELETE /api/events/{id}/registrations/me` (`registrations_cancel`) · `GET /api/events/{id}/registrations` — участники и заявки для организатора (`registrations_listForEvent`) · `POST /api/registrations/{id}/approve` (`registrations_approve`) · `POST /api/registrations/{id}/reject` (`registrations_reject`) · `GET /api/registrations/mine?status=&when=&page=0&size=20` — `PageResponse<MyRegistrationResponse>`, новые сверху, `when=UPCOMING|PAST` по наличию будущего SCHEDULED-занятия, size до 100 (`registrations_mine`) |
| `occurrences` | `GET /api/events/{id}/occurrences?from=&to=` (`occurrences_list`) · `POST /api/events/{id}/occurrences` — разовая дата (`occurrences_add`) · `PUT /api/events/{id}/occurrences/{occurrenceId}` — перенос (`occurrences_reschedule`) · `POST …/{occurrenceId}/cancel` с причиной, и для разового (`occurrences_cancel`) · `POST …/{occurrenceId}/confirm` — «Состоится» при кворуме (`occurrences_confirm`) · `POST`/`DELETE …/{occurrenceId}/attendance` (`occurrences_attend`, `occurrences_unattend`) · `GET …/{occurrenceId}/attendees` — организатору (`occurrences_attendees`) |
| `comments` | Обсуждение как чат. `GET /api/events/{id}/comments?after=` — по порядку, `after` — новые и изменённые после момента (`comments_list`) · `POST /api/events/{id}/comments` с `replyToId?` — сообщение или ответ на сообщение (`comments_create`) · `PUT /api/events/{id}/comments/{commentId}` — исправить своё (`comments_update`) · `DELETE /api/events/{id}/comments/{commentId}` — удалить своё мягко (`comments_delete`). В ответе: автор, `createdAt`, `editedAt`, `deleted`, `replyTo` (цитата), `repliesCount`, `isOrganizer`, `organization`, `isMine`, `canEdit`, `hidden`, `hiddenReason` |
| `recommendations` | Подробно: `docs/recommendations.md`. `GET /api/recommendations/events?lat&lon&radiusKm&sportId&from&to&page&size` — `PageResponse<RecommendedEventResponse>` (карточка + `score`, `distanceKm`, `reasons`, `discovery`), пусто для ORG/ADMIN (`recommendations_events`) · `GET …/events/{id}/explain` — признаки, веса, `eligible`/`excludedReason` (`recommendations_explain`) · `POST`/`DELETE …/events/{id}/dismiss` с `{reason}`, 204 (`recommendations_dismiss`, `recommendations_undismiss`) · `GET /api/recommendations/organizations?lat&lon&limit` (`recommendations_organizations`). `events_similar` считается тем же движком |
| `organizations` | `GET /api/organizations/me` (`organizations_me`) · `PUT /api/organizations/me` — анкета (`organizations_saveMine`) · `GET /api/organizations/featured` — организация месяца или пустой ответ (`organizations_featured`) · `GET /api/organizations/{id}` — публичная, только APPROVED, с наградами `awards`, `sports`, `hostedMeetings`, `participantsTotal` (`organizations_get`) |
| `users` | `GET /api/users/{id}` — публичный профиль, `sports`, `attendedCount`, доверие `hostedMeetings`/`participantsTotal` (`users_get`) · `PUT /api/users/me` (`users_updateMe`) · `GET /api/users/me/sports` (`users_mySports`) · `PUT /api/users/me/sports` (`users_saveMySports`) · `GET /api/users/me/wallet` — монеты, уровень, энергия, 20 последних операций, только роль USER (`users_wallet`) · `GET /api/users/me/achievements` — 6 достижений с прогрессом (`users_achievements`) · `GET /api/users/me/history?sportId=&from=&to=&page=0&size=20` — `PageResponse<AttendedOccurrenceResponse>` (`users_history`) · `GET /api/users/me/history/summary?from=&to=` — всего и по спорту (`users_historySummary`); период `[from,to)`, ISO date-time, to не позже текущего момента |
| `pets` | `GET /api/pets/catalog` (`pets_catalog`) · `GET /api/users/me/pet` (`pets_getMine`) · `PUT /api/users/me/pet` — образ целиком (`pets_saveMine`) · `PUT /api/users/me/pet/slots/{slot}` — надеть или снять в одном слоте (`pets_equip`) · `GET /api/pets/shop` — вещи с ценой, видом, `owned` (`pets_shop`) · `POST /api/pets/shop/{слот:код}/buy` (`pets_buy`) · `GET /api/users/{id}/pet` (`pets_getUser`). Надеть можно только своё (409). Подробно: `docs/beaver-backend-integration.md` |
| `admin` | `GET /api/admin/users?searchText=&role=&page=0&size=20` — `PageResponse<AdminUserResponse>`, новые сверху; поиск по логину/email/имени/фамилии, счётчики созданных событий и CONFIRMED-записей (`admin_listUsers`) · `GET /api/admin/stats?days=` — счётчики и `signupsByDay` «сколько присоединилось по дням» (`admin_stats`) · `GET /api/admin/organizations?status=&searchText=&page=&size=` — страница `PageResponse` (`admin_listOrganizations`) · `GET /api/admin/organizations/{id}` (`admin_getOrganization`) · `POST /api/admin/organizations/{id}/approve` · `…/reject` с причиной · `…/return` на доработку с причиной (`admin_approveOrganization`, `admin_rejectOrganization`, `admin_returnOrganization`) · `GET /api/admin/awards?month=2026-09` — предложение «Организации месяца» и счета кандидатов (`admin_listAwards`) · `POST /api/admin/awards/{id}/confirm` (`admin_confirmAward`) · `GET /api/admin/events?searchText=&status=&organizationId=&authorId=` (`admin_listEvents`) · `POST /api/admin/events/{id}/unpublish` · `DELETE /api/admin/events/{id}` с причиной · `POST /api/admin/events/{id}/restore` — вернуть снятое (`admin_unpublishEvent`, `admin_deleteEvent`, `admin_restoreEvent`) · `POST /api/admin/comments/{id}/hide` с причиной · `…/unhide` (`admin_hideComment`, `admin_unhideComment`) |

- `/api/admin/**` закрывается в `SecurityConfig` через `hasRole("ADMIN")`. Остальные проверки прав — в сервисах.
- Ошибки идут через `ApiExceptionHandler` (ProblemDetail): `NoSuchElementException` → 404, `UnauthorizedException` → 401, `ConflictException` → 409. **Добавить `ForbiddenException` → 403.**
- Текст ошибки (`detail`) пишем по-русски для человека: фронт показывает его как есть (`error.detail` в `authMutator`). Пример: «Запись закрыта: мероприятие снято с публикации».
- Поменяли API → `make back` → `cd frontend && yarn api:sync` → закоммитить `openapi.json` и `generated/`.

## Экраны и маршруты фронта

| Маршрут | Экран | Роли |
|---|---|---|
| `/auth/login` | Вход и кнопки демо-аккаунтов (есть в шаблоне) | все |
| `/auth/register` | Регистрация, шаг «Я занимаюсь спортом / Я представляю клуб» | все |
| `/` | Лента: поиск, фильтры (вид спорта, дата, уровень, режим записи) | вошедшие |
| `/events/:id` | Карточка: инфо, организатор со ссылкой на профиль или страницу, участники, статус моей записи, кнопка записи, обсуждение | вошедшие |
| `/events/new` | Создание события | USER, ORG (APPROVED) |
| `/my/registrations` | Мои записи со статусами | USER |
| `/my/events` | Мои события как организатора | USER, ORG |
| `/my/events/:id/manage` | Участники и заявки, «Принять» и «Отклонить» | автор события |
| `/org` | Кабинет организации: анкета, статус заявки, причина отказа | ORG |
| `/orgs/:id` | Публичная страница организации и её события | вошедшие |
| `/users/:id` | Публичный профиль организатора-человека (ТЗ требует переход к профилю организатора) | вошедшие |
| `/admin` | Дашборд со счётчиками | ADMIN |
| `/admin/organizations` | Заявки и список организаций, одобрение и отклонение | ADMIN |
| `/admin/events` | Поиск событий, снятие с публикации и удаление с причиной | ADMIN |

- `/pet` — только отладочная страница бобра (эмоции, готовые образы, примерка вещей админа). Пользователь туда не заходит, ссылок на неё из интерфейса нет. Гардероб для пользователя — диалог `WardrobeDialog` (`features/pet-wardrobe`) с предпросмотром питомца; открывается кнопкой «Изменить образ» в паспорте профиля (мобильный — «Сменить»).
- Всё, кроме `/auth/*`, под `auth-guard` (`src/app/routes.ts`). `/dashboard` из шаблона заменяется лентой на `/`.
- Глобальная шапка показывает текущий аккаунт и кнопку «Сменить аккаунт» (выход → `/auth/login` с демо-кнопками), чтобы эксперт быстро переключал роли.

## Сценарии приёмки (их проверяют эксперты)

Каждый проходит без ручной правки данных.
1. **Создание события пользователем.** Пользователь создаёт событие: вид спорта, время, место, условия, режим записи. Другой пользователь находит его и открывает. Отдельно проверяется событие с новым видом спорта.
2. **Допуск организации.** Организация отправляет заявку, админ одобряет или отклоняет, организация видит результат. После одобрения она публикует событие без согласования, а пользователь видит страницу организации и её событие.
3. **Свободная запись.** Пользователь записывается и сразу видит «Вы записаны», организатор видит его в списке участников.
4. **Запись по заявке.** Пользователь подаёт заявку и видит «Ожидает решения». Организатор принимает или отклоняет, статус обновляется у обоих. Работают обе ветки.
5. **Уточнение условий.** Пользователь задаёт вопрос в обсуждении, организатор отвечает, авторство видно.
6. **Снятие с публикации.** Админ снимает или удаляет событие. Оно исчезает из ленты, записаться нельзя даже по прямой ссылке.

## Демо-данные

Создаются в `DemoSeeder.seed()` при старте, только при `DEMO_MODE=true` (кнопки входа отдаёт `DemoService`). Демо **ничего не рисует поверх**: оно действует как клиент и вызывает те же сервисы, что REST-контроллеры (регистрация, анкета организации, решение админа, создание события, запись, решение по заявке, комментарии и ответы, соорганизатор, снятие админом, отметки в серии, покупка в магазине, образ и имя бобра, подтверждение «Организации месяца»). Монет (`ADJUSTMENT`), достижений, вещей, наград организаций и статусов демо напрямую не пишет: они получаются из настоящей обработки прошедших встреч (`RewardService`). Единственный обман — время: сервисы не создают прошлое, поэтому прошедшая встреча создаётся с будущей датой и `DemoDataRepository` переносит метки времени назад, после чего `DemoHistory` сразу вызывает настоящее начисление (встречи проигрываются по порядку времени, строки журнала получают дату конца встречи). Сид идемпотентный: если аккаунт `admin` уже есть, ничего не создаётся; всё выполняется одной транзакцией. Аккаунты: `admin`, `anna`, `petr`, `olga`, `ladya` и `enisey` (кнопками на входе), массовка `dmitry`, `elena`, `sergey`, `nikolai`, `yoga` и `bobry`. Даты событий задаются от `clock.instant()` («послезавтра в 19:00»), чтобы демо не устаревало. Полный сброс: `docker compose down -v`.

- Пользователи: Анна (новичок), Пётр (любитель, автор события «по заявке»), Ольга (пенсионерка, любит зарядку), ещё 3–5 человек для заполненных списков участников.
- Организации: шахматный клуб «Ладья» — APPROVED, с событиями; беговое сообщество «Енисей» — PENDING, для проверки одобрения; «Йога на Татышеве» — REJECTED, с причиной.
- Админ: «Администратор» (единственный аккаунт, который создаётся строкой, а не регистрацией: через API админ не регистрируется).
- Экономика (всё из обработки встреч): Пётр провёл 6 встреч в разные дни (3+ участника) → «Собрал команду», «Душа компании» с короной; Анна сходила на 7 встреч (в том числе «Хищных бобров») → «Первый шаг», «Разносторонний», «Свой бобр», 2 уровень; «Ладья» два месяца проводит встречи → вехи и «Организация месяца» за прошлый месяц, подтверждённая админом.
- События (места в Красноярске, даты в будущем):
    - футбол, FREE, от пользователя;
    - шахматы, REQUEST, от «Ладьи», 2–3 заявки PENDING;
    - утренняя пробежка, FREE;
    - зарядка во дворе, FREE, уровень «Любой»;
    - нишевый вид, например петанк, `custom = true`;
    - одно событие UNPUBLISHED с причиной и записанным пользователем;
    - серия «Баскетбол по вечерам» от Петра: вт 20:00 еженедельно + вс 14:00 раз в 2 недели, на 3 месяца, отметки участников, одно занятие отменено;
    - в нескольких событиях есть комментарии, включая ответы организатора; одно рекламное сообщение в футболе скрыто админом;
    - «Настольный теннис: один стол на двоих» (2 места) заполнен, Ольга в листе ожидания — Анна при записи тоже встанет в очередь;
    - у турнира «Ладьи» закреплено объявление организатора; у клубов в анкетах виды спорта, один клуб массовки в статусе REVISION.
- Кроме персонажей сценариев — массовые данные «живого проекта» (`DemoBulkSeeder` + справочник `DemoBulkData`): ~260 пользователей в 12 городах (Москва, Петербург, Новосибирск, Екатеринбург, Казань, Нижний, Красноярск, Самара, Краснодар, Владивосток, Сочи, Пермь) с регистрациями за полгода и всплеском «10 октября»; ~20 клубов во всех статусах; ~270 мероприятий на реальных площадках (прошедшие и будущие, онлайн, часть снята или удалена); ~2000 записей во всех статусах, соорганизаторы, ~500 комментариев; образы бобров. Генерация детерминированная (seed), даты от сегодняшнего дня; люди и клубы заводятся строками аккаунтов с общим хешем пароля (bcrypt на сотни аккаунтов долгий), всё остальное идёт через сервисы; весь демо-сид ~11 с при первом старте.
- Бобр (`DemoPetSeeder`): Анна, Пётр и Ольга покупают вещи на заработанные монеты (`ShopService.buy`), эксклюзивы дают достижения, образ сохраняется через `PetService.save`. Настроение вычисляет `PetMoodService` по событиям и записям, в гардеробе оно не сохраняется.
- Метки времени в прошлом пишет только `DemoDataRepository` (Hibernate ставит `createdAt` = «сейчас»), плюс служебный код организации «Хищные бобры» (`predatory-beavers`), которого нет в API. В тестах демо выключено (`application-h2.yml`).
- На фронте в `demo-accounts.tsx` в `ROLE_LABEL` добавить `ORG: "организация"`.

## Чего не делаем

- Восстановление пароля, OAuth, почта и SMS для входа. Маршруты `forgot-password`, `oauth2/callback` и блок `alternative-block` из шаблона убрать из навигации.
- Интеграцию с реестрами (документы организация загружает файлами в S3, проверяет их админ вручную).
- Нативное мобильное приложение.
- Мессенджер в реальном времени и обмен файлами.
- Подтверждение посещения, результаты и судейство.
- Уведомления на почту и в мессенджеры — только после всех шести сценариев.

## Структура бэкенда

Пакеты по слоям в `com.hackathon.app`: `rest`, `service`, `repository`, `domain` (внутри `entity`, `enums`, `dto`, `mapper`, `exception`), `util`, `config` (подробно в `docs/architecture.md`).
- **Исключение: демо-данные живут в отдельном пакете `com.hackathon.app.demo`** (`DemoSeeder`, `DemoBulkSeeder`, `DemoBulkData`, `DemoHistory`, `DemoEconomySeeder`, `DemoPetSeeder`, `DemoService`, `DemoController`, `DemoProperties`, `DemoDataRepository`, `DemoAccountResponse`). Пакет `demo` вызывает сервисы как клиент и не нужен остальному коду: ничто вне `demo` от него не зависит. Пути `/api/demo/**` и ключи `app.demo.*` те же.
- Enum-ы модели — отдельные файлы в `domain.enums`, а не вложенные в сущность или DTO; если имя общее — с префиксом сущности (`EventStatus`, `RegistrationStatus`, `OrganizationStatus`).
- **Заполнение полей — только в `mapper`** (MapStruct, `@Mapper(config = MappingConfig.class)`): сервис решает (статус, время, права) и передаёт значения в маппер, сеттеров в сервисах нет. Поля без источника пропускаются без `ignore = true`, каждая строка проходит через `util.Strings.blankToNull`.
- `util` — статические утилиты (`@UtilityClass`, методы помечать `static` явно, иначе MapStruct внедряет класс как бин).
- Логи в контроллерах на английском: `Endpoint called: <METHOD> <путь>, userId=..., request=...` и `Endpoint response: <METHOD> <путь>, response=...`.
- Зависимости только вниз: `rest → service → repository → entity`. Контроллер не ходит в репозиторий напрямую, сервис не знает про HTTP/cookie.
- Сущности наружу не возвращать, только `dto` (records). Новая фича = новые файлы в этих же пакетах, а не новый корневой пакет.
- Контроллеры только под `/api/...`, с `produces = APPLICATION_JSON_VALUE` и `@Tag` + `@Operation(operationId = "<tag>_<действие>")` (от этого зависят имена хуков Orval).
- После изменения API: поднять бэк и выполнить `yarn api:sync` во `frontend/`, закоммитить `openapi.json` и `generated/`.
- Бизнес-логика и проверки прав — в `service`. Политика доступа к событию — один класс (правило 8), без копий проверок по контроллерам.
- Транзакции на методах сервиса (`@Transactional`), чтение — `readOnly = true`.

**База и миграции**
- Миграции: `backend/src/main/resources/db/migration`, Flyway, только вперёд. Применённые не править, новые — `V3__...`, `V4__...`. Пример `V1__init.sql` (таблица `note`) не нужен: удалить новой миграцией.
- Номер миграции занимаем перед пушем: подтянуть `main` и взять следующий свободный. Два одинаковых номера Flyway не запустит.
- В проде `ddl-auto: validate`: миграции должны точно совпадать с сущностями. Менялись миграции или сущности — запустить `./gradlew postgresTest`.
- **Тесты идут на H2:** схема строится из сущностей, Flyway выключен. Поэтому запросы, которые проходят через тесты, пишем переносимо: JPQL, derived-методы Spring Data, `lower(...) like`. Никаких `pg_trgm`, `tsvector`, `jsonb`-операторов и PostGIS в таких запросах.
- PostGIS есть: образ `postgis/postgis:18-3.6-alpine` (только amd64). Источник правды — `events.lat/lon` в сущности; колонку `location geometry(Point,4326)` с GiST-индексом база вычисляет сама (`GENERATED ... STORED`), в сущности её нет. Пространственные запросы — только нативным SQL в `EventMapRepository`; H2 их не выполнит, поэтому такие тесты идут с тегом `postgres` (`./gradlew postgresTest`).
- Карта: `GET /api/events/map` (`events_map`) отдаёт GeoJSON `FeatureCollection` по видимой области `minLon/minLat/maxLon/maxLat`, координаты `[lon, lat]`; кластеризует фронт. Фильтры совпадают с лентой: меняешь `EventSpecifications.feed` — поменяй и `EventMapRepository`.
- Индексы и `create extension pg_trgm` в миграциях можно: H2 их не видит. Нечёткий поиск вида спорта — только как улучшение с фолбэком на `like`.

## Фронтенд

Структура FSD в `frontend/src`: `app` (роуты, провайдеры), `pages`, `widgets`, `features`, `entity`, `shared` (`shared/components/ui` — shadcn, `shared/api` — Orval). Подробно: `docs/orval.md`, `docs/frontend.md`.
- Файлы в `app/routes/*` тонкие: `meta` и рендер страницы из `pages/`.
- Данные — только через сгенерированные Orval-хуки (`@/shared/api/generated/core/...`), руками axios не вызываем.
- Подписи статусов для UI (текст, цвет, иконка) в одном месте: `src/shared/lib/statuses.ts`. Статусы записи, события и организации не пишем строками по компонентам.
- Доступность: крупный шрифт и кнопки, контрастные состояния, понятные подтверждения. Цвет не единственный носитель смысла.
- **Дизайн Memphis (Figma).** Токены лежат в `src/app/styles/app.css`.
    - Только shadcn/ui (`shared/components/ui`) + Tailwind, стили через токены, без хардкода цветов (`bg-ink`, `text-ultramarine`, а не `#13142B`).
    - Тени жёсткие, без blur: `shadow-[3px_3px_0_var(--ink)]` (токен `shadow-hard-sm`) и `shadow-[6px_6px_0_var(--ink)]` (`shadow-hard`).
    - Обводка 2px внутри блока (`box-border`, `border-2 border-ink`).
    - Шрифты: Unbounded (заголовки, `font-display`) и Manrope (текст, `font-sans`).
    - Не «улучшать» дизайн: размеры и текст как в Figma.
- **Хвосты шаблона убрать:**
    - тексты NaturalQL: `auth-layout.tsx`, `home.tsx`, `app-sidebar.tsx`;
    - фолбэк `https://42team.ru/api` в `useAlternativeBlock`;
    - `lang="en"` в `root.tsx` → `ru`.

## Работа вдвоём

Каждый ведёт свои фичи насквозь — бэк и фронт.

| Кто | Бэкенд | Фронт |
|---|---|---|
| Вася | `Event*`, `Registration*`, `Sport*`, `EventAccessPolicy` | лента, карточка события, создание, мои записи, управление заявками |
| Максим | `Organization*`, `Admin*`, `Comment*`, `users`/auth, `DemoService`, `DemoSeeder` (организации и комментарии) | регистрация с типом аккаунта, кабинет и страница организации, админка, обсуждение, шапка |

Общие файлы меняем коротким PR или договорившись голосом:
- `AppUser` и `SystemRole`, `SecurityConfig`, `ApiExceptionHandler`;
- номера миграций;
- `openapi.json` и `generated/`: при конфликте не мержим руками, а заново запускаем `yarn api:sync` на смерженном бэке;
- `src/shared/lib/statuses.ts`, `src/shared/components/ui`, `src/app/routes.ts`.

## Документация

Вся документация в папке `docs/` (оглавление в `docs/README.md`); в корне остаётся только короткий `README.md`. Менялся деплой, переменные `.env` или процесс запуска — обновить `docs/dev-faq.md` и `docs/deploy.md`.

**Исключение для сдачи:** ТЗ требует, чтобы `README.md` содержал:
- описание продукта, стек, структуру, зависимости, запуск;
- демо-аккаунты всех ролей;
- шаги проверки шести сценариев;
- правила доступа и модерации;
- что имитировано и известные ограничения;
- реализованные доп. фичи.

В корневом README эти разделы есть кратко, подробности — ссылками в `docs/`.

## Сдача

- Исходники в репозитории на **GitVerse** (CI и деплой живут на GitHub, в конце пушим и туда) плюс ссылка на работающий прототип.
- На демо-сервере обязательно `DEMO_MODE=true` в `/opt/app/.env` (по умолчанию в `deploy/` он выключен), иначе у экспертов не будет демо-входа. Команда: `docs/dev-faq.md`, раздел про демо-режим.
- Презентация: на демо явно разделять, что работает, а что существует только в макетах.

## Git

- Никаких подписей агентов в коммитах и PR: не добавлять `Co-Authored-By`, `Generated with Claude Code` и любые похожие строки. Автор коммита — только пользователь.

## Тесты

**Тесты пишет Codex**, а не Claude. Модель по умолчанию задана в `.codex/config.toml`: `gpt-6.1-sol`, reasoning `medium` (нужна доверенная папка проекта в `~/.codex/config.toml`).
- Claude пишет код фичи и ставит Codex задачу: `/codex:rescue` (или субагент `codex:codex-rescue`). В задаче обязательно: какой флоу покрыть, какие неочевидные ветки (ошибки, права, границы), какие файлы смотреть, и «следуй правилам из раздела Тесты в CLAUDE.md».
- Claude после Codex читает тесты, запускает `./gradlew test` и сам не переписывает их без причины.
- Для этого проекта основа — по одному сквозному тесту на каждый сценарий приёмки. План тестов и подготовка данных — в `AGENTS.md`.

**Баланс: не слишком мало, но и не слишком много.** Каждый тест стоит времени на каждом запуске и в CI.
- На фичу: один сквозной сценарий «счастливого пути» + один на ошибки и границы + при необходимости 1–2 теста на неочевидные ветки (безопасность, права, гонки). Ориентир 2–4 теста на фичу.
- Сценарий покрывает флоу целиком (регистрация → вход → me → refresh → logout), а не «по тесту на метод». Если тест можно удалить, и ни один сценарий не потеряет покрытия, — удалить.
- Не писать тесты на геттеры, простые маппинги, конфиги и «contextLoads». **Демо-режим (`DemoService`, `DemoSeeder`, `DemoController`, кнопки быстрого входа) тестами не покрываем.**
- Если фича вообще не имеет ветвлений и риска (прокидывание данных), теста может не быть.

**Комментарий перед каждым тестом обязателен, подробный.** Javadoc-блок на русском с четырьмя частями:
```
/**
 * ФЛОУ: что за пользовательский сценарий проверяем, одной-двумя фразами.
 * ШАГИ: 1. ... 2. ... 3. ... (в том порядке, как идут в коде)
 * ПРОВЕРЯЕМ: какие результаты и побочные эффекты (статусы, cookie, записи в БД).
 * ПОЧЕМУ ВАЖНО: что сломается у пользователя, если сценарий нарушится.
 */
```
Образец: `AuthFlowE2ETest`. Внутри теста короткие комментарии к шагам.

**Техника:**
- Основной вид — «почти E2E»: `@SpringBootTest` + `MockMvc`, весь контекст, настоящая цепочка Security, ничего своего не мокаем.
- **Тесты пишутся через тестовый API** `e2e/support` (`TestApi`, `Actor`, `EventForm`, `OrganizationForm`, `ApiAssertions`): участники и действия (`api.newUser("petya")`, `petya.joinEvent(id)`, `author.approve(id)`), ответы — настоящие DTO с проверками AssertJ, отказ — `assertThatApi(() -> ...).fails(FORBIDDEN, "текст")`. Нужного действия нет — добавить метод в `Actor`, а не писать `mvc.perform` и `jsonPath` в тесте. Сырой запрос (`actor.raw(...)`) — только для формата, который не выражается DTO (флаги cookie, GeoJSON).
- База в тестах — H2 (`@ActiveProfiles("h2")`, `src/test/resources/application-h2.yml`): стартует мгновенно.
- Testcontainers (настоящий Postgres) — **один** смоук-тест на миграции Flyway и соответствие схемы сущностям (`PostgresMigrationsTest`, тег `postgres`). Он **не входит** в обычный `./gradlew test` (быстрый, без Docker); запускается `./gradlew postgresTest`, а `./gradlew check` (и CI) гоняет оба. Менялись миграции или сущности — запустить `postgresTest`. Новые Testcontainers-тесты не добавлять без причины.
- Ориентир: весь `./gradlew test` быстрее ~30 секунд. Если вырос, сначала искать лишние тесты, а не оптимизировать.

## Хуки коммитов

Включаются автоматически: при `yarn install` (скрипт `prepare`), при первой сборке Gradle (задача `installGitHooks`) и при старте сессии Claude Code (SessionStart). Вручную: `make hooks` / `git config core.hooksPath .githooks`. Нужен Node.
- `commit-msg` и `pre-commit` (`scripts/hygiene.mjs`) отклоняют подписи агентов (`Co-Authored-By`, `Generated with ...`, упоминания Claude/Codex/OpenAI и т.п.) и мат — в сообщении коммита и в добавленных строках кода. Исключения: `CLAUDE.md`, `AGENTS.md`, `.claude/`.
- Мусорные файлы (`.DS_Store`, `*.log`, `.env`, ключи, `node_modules`, `build`, `.idea` и т.п.) не пропускаются в коммит; `make junk` — отчёт по уже отслеживаемым, `make clean` — удалить локальные артефакты сборки.
- `node scripts/hygiene.mjs scan` — отчёт по истории и дереву, ничего не меняет.
- `node scripts/hygiene.mjs scrub-history` — dry-run очистки сообщений старых коммитов от подписей; `--apply` переписывает их (делает backup-ветку и **не пушит**; обновление удалённой ветки — только осознанным `git push --force-with-lease`).
- Не обходить хуки через `--no-verify`. Если хук блокирует, исправить текст, а не отключать проверку.
- В Claude Code подпись в коммитах и PR отключена настройкой `attribution` в `.claude/settings.json`.

## Codex

Codex (OpenAI) подключён как плагин Claude Code: `.claude/settings.json` в репозитории сам предлагает его установить при первом запуске в проекте. Через MCP не подключаем: `codex mcp-server` удалён в Codex CLI 0.154.0, официальная замена — плагин `codex@openai-codex`.

Настройка у каждого (один раз): `npm install -g @openai/codex`, затем `codex login`, затем в Claude Code `/codex:setup`. На Windows надёжнее WSL; нативный Windows у Codex экспериментальный.

Когда делегировать Codex (остальное делаем сами):
- `/codex:review --background` — независимое ревью перед коммитом/PR (только чтение).
- `/codex:adversarial-review <на что давить>` — критика выбранного решения, особенно auth, миграции БД, деплой.
- `/codex:rescue <задача>` — **написать тесты** (основная задача, см. раздел «Тесты»), застряли на баге или нужен второй проход; можно `--background`, результат через `/codex:status` и `/codex:result`.

Правила:
- Задачу Codex формулируем самодостаточно: что сломано, как воспроизвести, что считать готовым.
- Результат Codex — это предложение: читаем диф и прогоняем тесты, прежде чем принимать.
- Не включать `--enable-review-gate`: это длинные циклы Claude↔Codex, которые быстро съедают лимиты.

## Доп. фичи

Только после того, как шесть сценариев проходят на стенде. Каждая фича делается целиком: таблица → API → экран → демо-данные → строка в README. Статичный экран баллов не даёт.

1. Онбординг после регистрации: интересы (`UserSport`), уровень, район, удобное время; лента становится персональной.
2. Шаг «Что» при создании события: вид спорта с автодополнением, подсказка «Возможно, «Падел»?» и кнопка «Добавить «Сапсёрфинг» как новый вид».
3. Итог заявки без тупика: принято — «Вы участник» и приватные детали; отклонено — «Заявка отклонена», причина и блок «Похожие встречи».
4. «Поделиться» после создания события: ссылка для мессенджеров, QR-код, карточка-афиша для печати.
5. Онлайн-формат (`format = ONLINE`, ссылка видна только участникам) и карта (бэкенд готов: `events_map`, PostGIS; фронт — 2ГИС MapGL + Clusterer).
6. Дальше по выбору: кворум «состоится, если наберём N», «Кто что берёт», подписки на почту и Telegram, подбор встреч, команды, пэт-помощник.

## Конец хакатона: очистка репозитория

Служебные файлы (`CLAUDE.md`, `AGENTS.md`, `.claude/`, `.codex/`, `frontend/.mcp.json`, `docs/final.md`, `scripts/finalize.mjs`) **и проверки коммитов** (`.githooks`, `scripts/hygiene.mjs` вместе с их подключением в Makefile, `package.json`, Gradle) **до конца хакатона остаются в репозитории**, чтобы вся команда работала одинаково. Не удалять их раньше времени.

В самом конце один человек выполняет чеклист и «кнопку» из `docs/final.md`:
```
node scripts/finalize.mjs                  # dry-run: что будет убрано
node scripts/finalize.mjs --apply          # один обычный коммит
node scripts/finalize.mjs --apply --purge  # то же + удалить служебные файлы и с диска (необратимо)
git push origin main                       # обычный push, без --force
```
История не переписывается. После pull у остальных участников служебные файлы пропадут из рабочей папки, поэтому предупредить команду заранее.
