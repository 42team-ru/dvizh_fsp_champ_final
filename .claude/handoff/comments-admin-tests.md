# Хендофф: тесты на обсуждение, модерацию мероприятий и страницу организации

Код фичи готов (бэкенд), тестов на него нет. По правилам `CLAUDE.md` тесты пишет Codex.
Запуск: в Claude Code `/codex:rescue --background` и вставить блок «Задача» ниже целиком; результат — `/codex:status`, `/codex:result`.
Приёмка: прочитать диф (Javadoc ФЛОУ/ШАГИ/ПРОВЕРЯЕМ/ПОЧЕМУ ВАЖНО, ничего не замокано, production-код не тронут), `cd backend && ./gradlew test`.

## Задача

> Скопировать отсюда и до конца файла.

Напиши тесты для бэкенда: сценарий 5 (обсуждение под мероприятием), сценарий 6 (админ снимает и удаляет мероприятия) и доработки сценария 2 (события на странице организации). Следуй правилам из раздела «Тесты» в `CLAUDE.md`: 2–4 сквозных теста на фичу, `@SpringBootTest` + MockMvc на H2, Javadoc перед каждым тестом. Production-код не меняй; если тест упирается в баг — опиши: что, как воспроизвести, где в коде.

**Что смотреть** (`backend/src/main/java/com/hackathon/app/`):
- `rest/CommentController.java`, `service/CommentService.java`;
- `rest/AdminEventController.java`, `service/AdminEventService.java`;
- `service/EventAccessPolicy.java`: `commentBlockedReason`, `organizerIds`, `unpublishBlockedReason`, `registerBlockedReason` (точные тексты отказов);
- `domain/dto/CommentResponse.java` (`isOrganizer`), `ViewerResponse.java` (`canComment`), `EventResponse.java` (`organization`), `EventFilter.java` (`organizationId`), `AdminEventResponse.java`, `AdminStatsResponse.java`;
- общие шаги — `backend/src/test/java/com/hackathon/app/e2e/support/E2eSupport.java`, образцы — `OrganizationApprovalE2ETest`, `RegistrationE2ETest`.

**Ручки:** `GET/POST /api/events/{id}/comments` · `GET /api/admin/stats` · `GET /api/admin/events?status&searchText&page&size` · `POST /api/admin/events/{id}/unpublish` (тело `{"reason"}`) · `DELETE /api/admin/events/{id}` (тело `{"reason"}`) · `GET /api/events?organizationId=`.

**Что покрыть:**
1. Обсуждение, счастливый путь: незаписанный пользователь пишет вопрос (201, `isOrganizer=false`), автор отвечает (`isOrganizer=true`), соорганизатор тоже получает `isOrganizer=true`; список — по порядку создания.
2. Обсуждение, границы: пустой текст — 400; мероприятия нет — 404; у удалённого (`DELETE` админом) писать нельзя — 409 «Мероприятие удалено, обсуждение закрыто», а `viewer.canComment=false`; у снятого с публикации писать можно.
3. Модерация, сквозной: пользователь записан → админ снимает с причиной → нет в ленте, по ссылке `status=UNPUBLISHED` и `moderationReason`, запись 409 «Запись закрыта: мероприятие снято с публикации», в `GET /api/registrations/mine` запись осталась с `event.status=UNPUBLISHED`; затем админ удаляет → `DELETED`, повторное снятие 409 «Мероприятие удалено, снимать нечего».
4. Модерация, права и форма: не-админ на `/api/admin/events` и `/api/admin/stats` — 403; снятие без причины — 400; `status`-фильтр и `searchText` в админке возвращают только нужное.
5. Сценарий 2: одобренная организация публикует → `GET /api/events?organizationId=` возвращает только её события; в карточке `organization.id/name`.

**Важно:** админ создаётся через репозиторий (см. `E2eSupport`), организация одобряется через `/api/admin/organizations/{id}/approve`. Демо-режим (`DemoSeeder`) тестами не покрываем.
