# Хендофф: тесты на бобра (образ, админка вещей) и график регистраций

Код фичи готов (бэкенд), тестов на него нет. По правилам `CLAUDE.md` тесты пишет Codex.
Запуск: в Claude Code `/codex:rescue --background` и вставить блок «Задача» ниже целиком; результат — `/codex:status`, `/codex:result`.
Приёмка: прочитать диф (Javadoc ФЛОУ/ШАГИ/ПРОВЕРЯЕМ/ПОЧЕМУ ВАЖНО, ничего не замокано, production-код не тронут), `cd backend && ./gradlew test`, после — `./gradlew postgresTest`.

## Задача

> Скопировать отсюда и до конца файла.

Напиши тесты для бэкенда бобра-маскота и графика регистраций. Следуй правилам из раздела «Тесты» в `CLAUDE.md`: 2–4 сквозных теста на фичу, `@SpringBootTest` + MockMvc на H2, Javadoc перед каждым тестом. Минимальные сценарии — в разделе «Минимальные тесты бэкенда» `docs/beaver-backend-integration.md`. Production-код не меняй; если тест упирается в баг — опиши: что, как воспроизвести, где в коде.

**Что смотреть** (`backend/src/main/java/com/hackathon/app/`):
- `rest/PetController.java`, `rest/AdminPetController.java`, `rest/AdminEventController.java` (`stats`);
- `service/PetService.java` (образ, слот, случайная вещь, тексты отказов), `service/PetCatalogService.java` (встроенный каталог создаётся при старте — в H2 он есть), `service/AdminPetService.java`, `service/AdminEventService.java#stats`;
- `domain/dto/Pet*.java`, `MeResponse.java` (`pet`), `AdminStatsResponse.java` (`signupsByDay`);
- общие шаги — `backend/src/test/java/com/hackathon/app/e2e/support/E2eSupport.java`.

**Что покрыть:**
1. Образ, счастливый путь: новый пользователь получает `{"mood":"idle","activity":"none","outfit":{}}` → сохраняет `hc-sokol`/`helmet`/`hockeypants`/`hockey` → читает тот же образ через `GET /api/users/me/pet`, `GET /api/auth/me` (`pet`) и другим пользователем через `GET /api/users/{id}/pet` (в ответе только `mood/activity/outfit`) → `PUT /api/users/me/pet/slots/hat` `{"item":"headphones"}` меняет только головной убор → `{"item":null}` снимает.
2. Образ, границы: без входа — 401; неизвестная вещь, вещь из чужого слота (`outfit.hat = "medal"`), `"none"` и `""` в outfit, отсутствие `mood` — 400 с русским `detail`, сохранённый образ не меняется; неизвестный слот в `PUT .../slots/{slot}` — 404; `GET /api/users/<несуществующий>/pet` — 404; футболка + наушники + `programming` принимаются.
3. Админка: не-админ на `/api/admin/pets/**` — 403; админ создаёт слот (повтор — 409) и вещь multipart с PNG (в тестах `app.storage.type=memory` — проверь `application-h2.yml`); картинка отдаётся `GET /api/files/{id}`; пользователь надевает новую вещь в новый слот через `PUT /api/users/me/pet/slots/{slot}`; удаление вещи админом снимает её с бобра и убирает из каталога; встроенную удалить — 409.
4. Дашборд: `GET /api/admin/stats?days=7` — ровно 7 дней, последний — сегодня по Красноярску, зарегистрированные в тесте пользователи посчитаны сегодня.

**Важно:** админ создаётся через репозиторий (см. `E2eSupport`). PNG для загрузки — любой валидный (сигнатура `89 50 4E 47 ...`); можно взять `postman/fixtures/pet-item.png`. Демо-режим (`DemoSeeder`, `DemoPetSeeder`) тестами не покрываем.
