# Бобр: контракт backend, этап 1

Настроение вычисляет `PetMoodService`; пользователь сохраняет только одежду и инвентарь. Все встроенные коды гардероба сохранены. Растровых вещей и администрирования каталога больше нет: SVG рисует frontend. Подключение нового контракта к интерфейсу — этап 2; текущая страница остаётся конструктором с предпросмотром в URL.

## API

Все запросы требуют входа. Владелец определяется JWT, а не параметром запроса.

| Метод и путь | operationId | Ответ / действие |
|---|---|---|
| GET /api/pets/catalog | pets_catalog | `{slots: [{id, label, kind, builtIn, items: [{id, label, builtIn}]}]}`; kind только ACTIVITY/OUTFIT, слота mood и imageUrl нет |
| GET /api/users/me/pet | pets_getMine | Личный образ, вычисленные mood и status |
| PUT /api/users/me/pet | pets_saveMine | Полная замена activity/outfit, ответ с вычисленным состоянием |
| PUT /api/users/me/pet/slots/{slot} | pets_equip | `{ "item": "helmet" }` или `{ "item": null }`; инвентарь без вещи — none |
| GET /api/users/{id}/pet | pets_getUser | Только activity/outfit и mood=idle, ключ status отсутствует, в том числе при собственном id |
| GET /api/auth/me | auth_me | Поле pet совпадает с личным ответом |

PUT целиком принимает обязательные `activity` и `outfit`, без поля `mood`:

```json
{"activity":"hockey","outfit":{"shirt":"hc-sokol","hat":"helmet","bottom":"hockeypants"}}
```

Личный ответ, пример:

```json
{
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
| `outfit.hat` | `cap`, `headband`, `beanie`, `swimcap`, `helmet`, `headphones` |
| `outfit.eyewear` | `sunglasses`, `goggles` |
| `outfit.neck` | `medal`, `whistle` |
| `outfit.bottom` | `swimshorts`, `hockeypants` |
| `outfit.shirt`, обычная одежда | `football`, `running`, `training`, `judo`, `hockey`, `programming` |
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
