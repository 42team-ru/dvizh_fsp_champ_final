# Бобр: контракт backend и гардероба

Настроение вычисляет `PetMoodService`; пользователь сохраняет имя, одежду, инвентарь и необязательный фон. Встроенные вещи рисует frontend в SVG; их прежние коды сохранены. Гардероб профиля позволяет примерять, покупать вещи и комплекты, выбирать фон и сохранять образ. Дополнительные SVG-вещи администратор загружает через существующий импорт.

## API

Все запросы требуют входа. Владелец определяется JWT, а не параметром запроса.

| Метод и путь | operationId | Ответ / действие |
|---|---|---|
| GET /api/pets/catalog | pets_catalog | `{slots: [{id, label, kind, builtIn, items: [{id, label, builtIn}]}]}`; kind только ACTIVITY/OUTFIT, слота mood и imageUrl нет |
| GET /api/users/me/pet | pets_getMine | Имя name, личный образ, вычисленные mood и status |
| PUT /api/users/me/pet | pets_saveMine | Полная замена activity/outfit, ответ с вычисленным состоянием |
| PUT /api/users/me/pet/name | pets_rename | `{ "name": "Капитан Бобр" }`; возвращает PetResponse, гардероб не меняется |
| PUT /api/users/me/pet/slots/{slot} | pets_equip | `{ "item": "helmet" }` или `{ "item": null }`; инвентарь без вещи — none |
| GET /api/users/{id}/pet | pets_getUser | Имя name, activity/outfit и mood=idle, ключ status отсутствует, в том числе при собственном id |
| GET /api/auth/me | auth_me | Поле pet совпадает с личным ответом |

PUT целиком принимает обязательные `activity` и `outfit`, без поля `mood`:

```json
{"activity":"hockey","outfit":{"shirt":"hc-sokol","hat":"helmet","bottom":"hockeypants"}}
```

Личный ответ, пример:

```json
{
  "name": "Бублик",
  "mood": "thinking",
  "activity": "hockey",
  "outfit": {"shirt":"hc-sokol","hat":"helmet","bottom":"hockeypants"},
  "status": {
    "mood": "thinking",
    "message": "Жду ответа по «Хоккей во дворе»",
    "reason": "AWAITING_APPROVAL",
    "eventId": "a11680eb-bdcf-4779-a5eb-981831853319",
    "eventTitle": "Хоккей во дворе"
  }
}
```

`eventId` и `eventTitle` — null для общего приглашения и сна. Новый пользователь без действий получает sleep, без гардероба — activity=none и outfit={}. Публичный ответ всегда имеет mood=idle.

Отсутствующий слот в outfit снимает вещь; null тоже снимает. Пустая строка и одежда с кодом none недопустимы. Неизвестные слоты и вещи — 400 с русским ProblemDetail.detail, сохранение атомарно. Неизвестный слот в операции equip и отсутствующий пользователь — 404, без входа — 401. Слота mood больше нет ни в каталоге, ни в сохранённом образе.

Имя хранится в `users.pet_name VARCHAR(30) NULL` (миграция `V16__pet_name.sql`), null отображается как «Бублик». Поле `name` обязательно в личном и публичном PetResponse, включая ответы сохранения гардероба. Переименование схлопывает внутренние пробелы и обрезает края; допустимы 1–30 символов после нормализации. Пустое, отсутствующее или слишком длинное имя — 400 с точным `detail`: «Имя питомца — от 1 до 30 символов». Гость получает 401. PUT гардероба по-прежнему принимает только activity/outfit и не меняет имя.

## Экономика (этап 3)

Подробности и правила начисления: `docs/economy.md`. Монеты, магазин и достижения есть только у роли USER; для ORG и ADMIN эти методы отвечают 403 «Монеты и достижения есть только у личных аккаунтов».

| Метод и путь | operationId | Ответ / действие |
|---|---|---|
| GET /api/pets/shop | pets_shop | Все вещи: `id` (слот:код), `slot`, `code`, `label`, `price`, `kind` (BASE/SHOP/EXCLUSIVE), `owned`, `hint` («Дают за 10 встреч» у эксклюзивов), `isNew` (последняя волна каталога), `legendary` (`kind=EXCLUSIVE`) |
| POST /api/pets/shop/{item}/buy | pets_buy | `item` = `слот:код`, например `hat:cap`. 409: «Не хватает монет: нужно 150, у тебя 90», «Эта вещь уже у тебя», «Эту вещь нельзя купить — её дают за …»; 404 — нет вещи |
| GET /api/pets/shop/bundles | pets_bundles | Комплекты: `code`, `label`, `category: {code, label}`, полный `outfit`, `activity`, `items`, `fullPrice`, `price`, `missingCount`, `owned`, `locked`, `lockedReason` |
| POST /api/pets/shop/bundles/{code}/buy | pets_buyBundle | Атомарно докупить недостающее и заменить образ целиком; ответ PetResponse. Только надеть уже своё — бесплатно |
| GET /api/users/me/wallet | users_wallet | `coins`, `level` (1 + засчитанные встречи / 5, проведённая считается за две), `countedMeetings`, `energy` (0–5, встречи за 7 дней), `energyMax`, `entries` (20 последних операций) |
| GET /api/users/me/achievements | users_achievements | 6 достижений: `progress`, `goal`, `unit`, `reward`, `earnedAt` |

`PUT /api/users/me/pet` и `PUT …/slots/{slot}` отвечают 409 с подсказкой, если вещь не куплена и не получена («Вещь «Кепка» ещё не твоя: купи её в магазине за 60 монет»). Базовые вещи: `activity:none`, `shirt:training`, `hat:headband`, `background:meadow`. `hat:crown` — корона организатора, эксклюзив с собственным SVG. Статусы бобра дополнены `COINS_EARNED` и `ACHIEVEMENT_EARNED`.

## Комплекты, спортивные категории и фоны

48 комплектов распределены по 14 категориям; в каждой минимум два образа. `category.code` — стабильный ключ фильтра, `category.label` — русское название. В `football` входят общий футбол и все 11 ФК, в `hockey` — общий хоккей и все 9 ХК. Остальные коды: `basketball`, `running`, `volleyball`, `rackets`, `fitness`, `cycling`, `winter`, `water`, `martial`, `esports`, `chess`, `casual`.

Скидка 20% применяется к сумме **недостающих** вещей, если их хотя бы две; округление вниз. BASE уже принадлежит всем, EXCLUSIVE блокирует покупку до достижения. Владение, скидка, блокировка, списание и надевание фона работают так же, как для одежды. Повторное надевание своего комплекта ничего не списывает.

`background` («Фон») имеет kind `OUTFIT`: это необязательный сохраняемый элемент образа, а не активность. Новый enum и миграция не нужны: существующие `pet_slots`, `pet_items`, `user_pet_equipment` и `user_items` уже хранят произвольные слоты. Встроенный сид идемпотентно добавляет слоты и вещи и на PostgreSQL с `ddl-auto: validate`, и на H2.

```json
{"activity":"none","outfit":{"shirt":"running","bottom":"shorts","feet":"sneakers","background":"river"}}
```

`PUT /api/users/me/pet/slots/background` принимает `{"item":"river"}` / `{"item":null}`. Чужой платный фон → 409. При полной замене отсутствие `outfit.background` или null снимает фон; комплект без фона тоже его снимает. BASE-поляна доступна сразу, но автоматически не надевается: прежние прозрачные размещения сохранены.

Фронт рисует фон в корневом `slot-background`, вне прыгающего/дышащего рига. Выбранный фон переключает viewBox на квадрат, с округлым контуром позади бобра. Общий рендерер используется в паспорте, гардеробе, карточках комплектов и маленьких значках. `BeaverItemPreview` показывает отдельную декорацию в плитке магазина/гардероба. Собственные SVG id декораций изолированы для каждого экземпляра.

Вкладка «Комплекты» содержит фильтры категорий со счётчиками и «Все» по умолчанию; фокус и наведение примеряют образ. «Фон» показывает фоновые плитки; повторный выбор снимает фон. Платную вещь можно купить отдельно, после чего выбрать и сохранить образ. Покупка комплекта сразу надевает его на сервере.

Демо: Виктория автоматически покупает все SHOP из актуального каталога, включая новую одежду и фоны; Анна покупает `fitness` с `background:meadow` через `PetBundleService` за 144 монеты. Эксклюзивы по-прежнему выдаются достижениями.

Аудит, полный список новых вещей и цен, состав категорий и PNG-проверка: [отчёт по гардеробу](beaver-wardrobe-report.md). Для повторной проверки SVG: `node scripts/render-beaver-review.mjs /tmp/wardrobe-check /tmp/beaver-wardrobe-review` (снимки `catalog.json` и `bundles.json` из реального тестового контекста).

Организации: `GET /api/organizations/featured` (организация месяца, пустой ответ если нет), поле `awards` в `GET /api/organizations/{id}` (четыре вида наград, у вех `progress`/`goal`), админка `GET /api/admin/awards?month=2026-09` и `POST /api/admin/awards/{id}/confirm`.

## Правила вычисления

Один снимок `DbTimeRepository.now()`, первое совпадение побеждает. Настроение не хранится в оборудовании.

| Приоритет | Условие | mood / reason | Фраза |
|---|---|---|---|
| 1 | Своё или совместно организуемое событие UNPUBLISHED/DELETED, moderatedAt за 7 дней | offended / ORGANIZED_EVENT_MODERATED | Мою встречу «<title>» сняли: <moderationReason> |
| 2 | UNPUBLISHED/DELETED за 7 дней, моя запись CONFIRMED/PENDING | sad / REGISTERED_EVENT_MODERATED | Встречу «<title>» отменили: <reason> |
| 3 | REJECTED, decidedAt за 3 дня | sad / REGISTRATION_REJECTED | Не взяли на «<title>»: <decisionReason> |
| 4 | CONFIRMED, decidedAt за 24 часа и decidedById задан | wink / REGISTRATION_APPROVED | Меня приняли на «<title>»! |
| 5 | Моя CONFIRMED-запись на PUBLISHED, ближайшее занятие в следующие 48 часов | happy / EVENT_SOON | Скоро «<title>» — <сегодня/завтра/dd.MM.yyyy> в HH:mm! |
| 6 | PENDING-заявки на мою будущую PUBLISHED-встречу | surprised / NEW_REQUESTS | <N> <новая заявка/новые заявки/новых заявок> на «<title>» |
| 7 | Моя PENDING-заявка на будущую PUBLISHED-встречу | thinking / AWAITING_APPROVAL | Жду ответа по «<title>» |
| 8 | Нет будущих CONFIRMED/PENDING-встреч и организуемых встреч, нет созданных мною событий и записей за 14 дней | sleep / INACTIVE | Давно не тренировались… Найдём компанию? |
| 9 | Остальные случаи | idle / DEFAULT | Ближайшая встреча: «<title>» <сегодня/завтра/dd.MM.yyyy>; без будущей подтверждённой — Найдём компанию для тренировки? |

Окна включают обе границы; временные отметки из будущего не считаются недавними. Будущая встреча начинается строго позже now. Внутри правил 1–4 выбирается самая свежая модерация/решение, внутри 5–7 и 9 — ближайшее занятие, при равенстве UUID задаёт стабильный порядок. Числительные учитывают 11–14 и остаток по 10. При пустой причине суффикс «: причина» опускается.

Для серий и разовых событий используется ближайший SCHEDULED `EventOccurrence`; отменённые занятия пропускаются, первое startAt серии не подменяет ближайшее занятие. Дата и HH:mm — в event.timeZone, при null — Asia/Krasnoyarsk (пояс демо-города). Все запросы JPQL/derived, совместимы с H2.

## Хранение и совместимость

`V15__computed_pet_moods.sql` удаляет невстроенные вещи и слоты, слот настроения со всеми зависимыми вещами и оборудованием (ON DELETE CASCADE), затем колонку image_file_id. Старые миграции не меняются. Таблица files и объекты хранилища остаются: ссылки могли использоваться вне каталога. Устаревшее значение назначения файла сохранено исключительно для чтения прежних метаданных; новых загрузок этого назначения нет.

Встроенный каталог создаётся при старте идемпотентно, поэтому доступен и в H2 без Flyway. Специальных правил безопасности для старой админки не было, общая защита /api/admin/** остаётся для остальных функций.

## Демо и проверка

На свежем демо-наборе: anna — happy (пробежка завтра), petr — surprised (заявки на шахматы), olga — thinking (ожидает решения по заявке в клуб), sergey — offended (снятый волейбол), elena — sad (участница снятого волейбола). По мере истечения окон и изменения заявок состояния меняются по общим правилам. Существующие события сид не переписывает; для уже заполненной базы набор зависит от сохранённых действий.

`PetMoodE2ETest` проверяет переходы, приоритеты, окна времени, склонение заявок, приватность и сохранение гардероба без mood. Основная проверка: `cd backend && ./gradlew compileJava compileTestJava test`; миграции: `./gradlew postgresTest`. После изменения API нужно обновить OpenAPI и клиент Orval. Исходники интерфейса на этапе 1 не меняются.

## Полный список допустимых значений

| Поле | Значения |
|---|---|
| `mood` | `idle`, `happy`, `surprised`, `thinking`, `sad`, `wink`, `offended`, `sleep` |
| `activity` | `none`, `juggle`, `dribble`, `lift`, `chess`, `ski`, `hockey`, `esports`, `programming` |
| `outfit.hat` | `cap`, `headband`, `beanie`, `swimcap`, `helmet`, `headphones`, `cyclehelmet`, `crown` |
| `outfit.eyewear` | `sunglasses`, `goggles`, `roundglasses` |
| `outfit.neck` | `medal`, `whistle`, `scarf`, `bowtie` |
| `outfit.bottom` | `swimshorts`, `hockeypants`, `shorts`, `leggings`, `sweatpants` |
| `outfit.prop` | `volleyball`, `racket`, `paddle`, `yogamat` |
| `outfit.paws` | `boxinggloves`, `wristbands` |
| `outfit.feet` | `sneakers` (заменяют коньки, если одновременно выбраны хоккейные шорты) |
| `outfit.background` | `meadow` (BASE, 0), `stadium`, `rink`, `river`, `snowpark`, `gym`, `sunset`, `nightcity` (SHOP, по 100) |
| `outfit.shirt`, обычная одежда | `football`, `running`, `training`, `judo`, `hockey`, `programming`, `basketball`, `volleyball`, `polo`, `hoodie`, `tracksuit`, `puffer` |
| `outfit.shirt`, футбольные клубы | `zenit`, `cska`, `fakel`, `yenisey`, `krasnodar`, `lokomotiv`, `spartak`, `rostov`, `dynamo`, `akron`, `beavers` |
| `outfit.shirt`, хоккейные клубы | `hc-cska`, `hc-metallurg`, `hc-lokomotiv`, `hc-severstal`, `hc-torpedo`, `hc-barys`, `hc-spartak`, `hc-neftekhimik`, `hc-sokol` |

Одинаковые названия футбольного и хоккейного клуба — разные значения. `lokomotiv` означает ФК «Локомотив» Москва, `hc-lokomotiv` — ХК «Локомотив» Ярославль. `cska` и `hc-cska`, `spartak` и `hc-spartak` тоже не взаимозаменяемы. `dynamo` — футбольное «Динамо» Москва. `hockey` — общий объёмный свитер «Хищных бобров». `outfit.shirt = "programming"` — тёмная футболка с логотипом ФСП России; это отдельное поле от `activity = "programming"` (ноутбук с кодом). Готовый образ «Спортивное программирование» включает оба значения.

Значения чувствительны к регистру, уже выпущенные id не переименовывать. Если на сервере используются Java enum, JSON должен содержать именно эти строки, включая дефисы у `hc-*`, а не Java-имена `HC_CSKA`.

## Что означают активности

| ID | Что показывает фронт |
|---|---|
| `none` | Без инвентаря |
| `juggle` | Крупный футбольный мяч прыгает рядом; имя сохранено для совместимости |
| `dribble` | Крупный баскетбольный мяч прыгает рядом |
| `lift` | Гантели в лапах, подъём рук |
| `chess` | Доска и шахматные фигуры рядом |
| `ski` | Лыжи и палки на стойке |
| `hockey` | Шайба скользит вперёд-назад по льду, без клюшки и вертикальных подлётов |
| `esports` | Ноутбук с игровым экраном |
| `programming` | Ноутбук с кодом и результатом `Accepted` |

Элементы независимы: футбольная футболка, наушники и ноутбук с кодом — допустимая комбинация. У шапок и наушников общий `hat`, поэтому одновременно надевается один вариант. Хоккейный свитер включает краги; `hockeypants` включает коньки. Сервер не должен требовать шлем для хоккейной футболки или наушники для ноутбука.


## Примерка и личные образы

| Метод | operationId | Контракт |
|---|---|---|
| POST /api/pets/shop/buy-set | pets_buySet | `{items: ["hat:cap", "eyewear:sunglasses"], wear: true}`. Дубликаты id убираются, две вещи в одном слоте → 400. Покупаются только недостающие вещи, скидка 20% при 2+, округление вниз. Одна блокировка владельца, одна операция в журнале, выдача вещей и надевание в одной транзакции. `wear=false` сохраняет текущий образ, `wear=true` объединяет выбранное с ним. Ответ PetResponse; кошелёк фронт перечитывает. Эксклюзив → 409, недостаток → 409 «Не хватает N монет», неизвестный id → 404. Повтор уже оплаченного набора бесплатен. |
| GET /api/users/me/pet/looks | pets_looks | Массив `{id, name, activity, outfit}` в порядке создания, только образы текущего пользователя. |
| POST /api/users/me/pet/looks | pets_saveLook | `{name, activity, outfit}`, имя 1–30 символов. Проверяется весь образ и владение через те же правила `PetService` / `requireOwned`. Не меняет надетое. Максимум 4 образа, защищено блокировкой владельца; пятый → 409 «Можно сохранить не больше 4 образов», некупленная вещь → 409. |
| DELETE /api/users/me/pet/looks/{id} | pets_deleteLook | 204, удалить только свой образ, чужой или отсутствующий id → 404. |

Образы хранятся в `pet_saved_looks` (UUID, userId, name, activity, аудит), одежда — element collection
`pet_saved_look_outfit` (`look_id`, `slot_code`, `item_code`). Миграция V34. Надевание сохранённого
образа — существующий `PUT /api/users/me/pet`. Комплект покупается прежним `pets_buyBundle`
с полной заменой образа; произвольная примерка — `pets_buySet` с объединением.

Пользовательские экраны: `/profile/wardrobe` и `/profile/shop`. Примерка не пишет в API до покупки;
при выходе со страницы исчезает. Сохранение образа позволяет также добавить именованный вариант
в «Мои образы» (до четырёх). Подсказки наград соответствуют `docs/economy.md`: +10 за участие,
+30–80 за проведённую встречу с 3+ участниками, +30 за «Первый шаг» и +50 за «Разносторонний».

`widgets/beaver-pet/ui/item-thumb.tsx` используется в плитках, чипах, миниатюрах комплектов и модалках.
В SVG попадают только части вещи из `buildSlots`, без животного; составные вещи объединяются.
Встроенные вещи используют `item-bounds.json` — границы видимых пикселей, полученные офлайн через
librsvg/Pillow. Рисунки администратора измеряются `getBBox` один раз и кэшируются с учётом SVG и посадки.
Фоны отображаются квадратом, все поверхности используют токены Memphis.

Проверка всего каталога (Node 24, Python/Pillow, системные librsvg и cairo):
`node scripts/render-beaver-thumbs.mjs /path/to/catalog.json /tmp/beaver-thumbs`.
Скрипт создаёт PNG каждой вещи, атласы и файл границ; PNG/атласы в репозиторий не добавляются.
После изменения рисунков встроенных вещей обновить `item-bounds.json` из результата проверки.
