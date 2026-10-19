# Хендофф: тесты на мероприятия, записи и виды спорта

Код фичи готов (бэкенд), тестов на него нет. По правилам `CLAUDE.md` тесты пишет Codex.

## Как запустить

1. Один раз: `npm install -g @openai/codex` → `codex login` → в Claude Code `/codex:setup`.
   Проверка: `codex login status` не должен говорить «Not logged in».
2. В Claude Code: `/codex:rescue --background` и вставить блок «Задача» ниже целиком.
   Или попросить Claude: «запусти хендофф из `.claude/handoff/event-tests.md`».
3. Когда закончит: `/codex:status`, `/codex:result`.
4. Приёмка (делает Claude или ты):
   - прочитать диф тестов: Javadoc ФЛОУ/ШАГИ/ПРОВЕРЯЕМ/ПОЧЕМУ ВАЖНО перед каждым тестом, ничего своего не замокано, production-код не тронут;
   - `cd backend && ./gradlew test` — зелёный и быстрее ~30 с;
   - `cd backend && ./gradlew postgresTest` — зелёный (нужен Docker);
   - если Codex сообщил о баге — чинить в коде фичи, тесты не подгонять.

## Задача

> Скопировать отсюда и до конца файла.

Напиши тесты для бэкенда фичи «мероприятия, запись участников, виды спорта». Следуй правилам из раздела «Тесты» в `CLAUDE.md` и плану тестов из `AGENTS.md` (раздел «План тестов по сценариям» и «Подготовка данных в тестах»). Production-код не меняй. Если тест упирается в баг — не чини, опиши в ответе: что, как воспроизвести, где в коде.

**Что смотреть** (`backend/src/main/java/com/hackathon/app/`):
- `rest/EventController.java`, `rest/RegistrationController.java`, `rest/SportController.java` — пути и коды ответов;
- `service/EventAccessPolicy.java` — все правила «можно ли» и точные тексты отказов (`detail` в ProblemDetail);
- `service/EventService.java`, `service/RegistrationService.java`, `service/SportService.java`;
- `dto/EventRequest.java` (форма), `dto/EventResponse.java` + `dto/ViewerResponse.java` (карточка и блок `viewer`), `dto/EventSummaryResponse.java`, `dto/MyRegistrationResponse.java`;
- `resources/db/migration/V3__events.sql`; образец стиля тестов — `backend/src/test/java/com/hackathon/app/e2e/AuthFlowE2ETest.java`.

**Ручки:**
`GET /api/sports?query=` · `GET /api/events?q&sportId&from&to&level&joinMode&format` · `GET /api/events/mine` · `GET /api/events/{id}` · `POST /api/events` · `PUT /api/events/{id}` · `POST /api/events/{id}/registrations` (тело `{"message"?}` необязательно) · `DELETE /api/events/{id}/registrations/me` · `GET /api/events/{id}/registrations?status=` · `POST /api/registrations/{id}/approve` · `POST /api/registrations/{id}/reject` (тело `{"reason"?}`) · `GET /api/registrations/mine`. Всё требует входа (без cookie — 401).

**Важно про H2 и данные:**
- В H2 схема строится из сущностей, Flyway выключен, поэтому справочник `sports` пуст. Вид спорта в тестах создавай через API: `"sportName": "Футбол-<суффикс>"` в форме мероприятия (сервер создаст custom-вид). `sportId` бери из ответа (`sport.id`).
- ADMIN через API не создаётся: заведи через `AppUserRepository` + `PasswordEncoder` (`systemRole = ADMIN`, `authProvider = LOCAL`, `active = true`), потом войди через `/api/auth/login`.
- Мероприятие «уже началось» через API не создать (`startAt` — `@Future`): подготовь через `EventRepository` (`setStartAt` в прошлое у созданного через API). Так же «снять с публикации» — через репозиторий: `status = UNPUBLISHED`, `moderationReason = "..."` (ручки админа ещё нет).
- Общие шаги (регистрация+вход → cookie, создать админа, создать мероприятие) вынеси в хелпер `backend/src/test/java/com/hackathon/app/e2e/support/`. Контекст и H2 общие: имена пользователей с уникальным суффиксом, username ≥ 3 символов.
- Даты — `Instant.now().plus(2, DAYS)`.
- Текущее время для проверок сервер берёт из БД (`repository/DbTimeRepository`, JPQL `select current_instant`). На H2 это ещё ни разу не запускалось — если падает, это баг, опиши его.

**Классы и что покрыть** (ориентир 2–3 теста в классе):

1. `EventCreationE2ETest` (сценарий приёмки 1)
   - Счастливый путь: USER создаёт очное мероприятие со своим видом спорта (`sportName`) → 201, `status=PUBLISHED`, `level=ANY` и `joinMode=FREE` по умолчанию, `sport.custom=true`, `viewer.isOrganizer=true`, `viewer.canManage=true`. Второе мероприятие с `sportName` «  ФУТБОЛ-<суф>  » (другой регистр и пробелы) получает тот же `sport.id`, а `GET /api/sports?query=` находит ровно один такой вид. Другой USER находит мероприятие в `GET /api/events?q=` и по `sportId`, открывает карточку: `viewer.canRegister=true`, `privateDetails` = null. `GET /api/events/mine` у автора содержит оба. `PUT` автором меняет поля (200).
   - Ошибки и границы: ADMIN создаёт → 403 «Администратор не создаёт мероприятия»; ни `sportId`, ни `sportName` → 400; оба сразу → 400; очное без `address` → 400; `endAt` раньше `startAt` → 400; `startAt` в прошлом → 400; `PUT` чужим USER → 403; `PUT` с `capacity` меньше уже подтверждённых → 409.
2. `RegistrationE2ETest` (сценарии 3 и 4)
   - FREE: участник записывается → 201 `CONFIRMED`; в карточке у него `viewer.registrationStatus=CONFIRMED`, `participantsCount=1`, он есть в `participants` (без email); организатор видит его в `GET .../registrations`.
   - REQUEST: заявка с `message` → `PENDING`; `privateDetails` скрыты; организатор `approve` → `CONFIRMED`, `decidedById` = организатор, теперь `privateDetails` видны; второй участник → `reject` с причиной → `REJECTED`, в `GET /api/registrations/mine` у него статус и `decisionReason`. Организатор потом `approve` этого же отклонённого (исправляет ошибку) → `CONFIRMED`, если есть места.
   - Ошибки и права: организатор записывается на своё → 409; повторная запись → 409 и в базе одна строка `Registration`; отклонённый пробует записаться снова → 409; `approve`/`reject` чужим USER и ADMIN → 403; `GET .../registrations` не организатором → 403; `capacity=1`: второй → 409 «Мест нет», `approve` сверх лимита → 409; отмена (`DELETE .../registrations/me`) → `CANCELLED`, место освобождается, повторная отмена → 200, после отмены можно записаться снова (та же строка); отменить отклонённую → 409; запись и отмена на «уже началось» → 409.
   - Снятое с публикации (через репозиторий): нет в `GET /api/events`, карточка открывается (200) со `status=UNPUBLISHED`, `moderationReason`, `viewer.canRegister=false`; запись → 409 «Запись закрыта: мероприятие снято с публикации»; у уже записанного оно есть в `GET /api/registrations/mine` со статусом мероприятия.
   - Гонка: `capacity` реализован, поэтому один тест — N потоков (например, 8) одновременно записываются на мероприятие с `capacity=3`; подтверждено ровно 3, остальные 409.
3. `EventOrganizersE2ETest` (несколько организаторов, `POST/DELETE /api/events/{id}/organizers`, `service/EventOrganizerService.java`)
   - Счастливый путь: автор добавляет соорганизатора по логину → в ответе и в карточке `organizers` автор первым (`author=true`), затем соорганизатор; у соорганизатора в карточке `viewer.isOrganizer=true`, `canManage=true`, `canManageOrganizers=false`, видны `privateDetails`; он видит `GET .../registrations`, принимает и отклоняет заявки, редактирует через `PUT`, мероприятие есть в его `GET /api/events/mine`; записаться на него сам не может (409).
   - Ошибки и права: соорганизатор пытается добавить ещё кого-то → 403; добавить ADMIN → 409; добавить уже организатора → 409; добавить пользователя с записью PENDING/CONFIRMED → 409; неизвестный логин → 404; убрать автора → 409. Соорганизатор выходит сам (`DELETE .../organizers/{свой id}`) → 200, после этого `GET .../registrations` и `approve` → 403.
4. `PostgresMigrationsTest` — не новый класс, дополни существующий: после входа создать мероприятие со справочным видом спорта (`GET /api/sports` → первый `id`, проверить, что сиды V3 на месте) и записаться другим пользователем. Это прогоняет на настоящем Postgres `SELECT ... FOR UPDATE`, `select current_instant` и UUID-сиды. В Javadoc поправь «V1/V2» на «V1–V3».

**Готово, когда:** `cd backend && ./gradlew test` и `./gradlew postgresTest` зелёные, `./gradlew test` быстрее ~30 секунд. В ответе: список тестов (класс → метод → что проверяет), вывод прогона и найденные баги, если есть.
