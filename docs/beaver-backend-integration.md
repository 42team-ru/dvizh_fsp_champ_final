# Бобр: API

Питомец пользователя: имя, одежда, инвентарь, вычисляемое настроение, магазин и сохранённые образы.
Встроенные вещи рисует фронт в SVG ([beaver-pet.md](beaver-pet.md)); дополнительные вещи админ загружает
SVG-файлами. Экономика — монеты, цены, достижения: [economy.md](economy.md).

Все запросы требуют входа, владелец определяется по сессии. Монеты, магазин и достижения — только у
`USER`; для `ORG` и `ADMIN` — `403`.

---

## 1. Образ

| Метод | Путь | Что |
|---|---|---|
| GET | `/api/pets/catalog` | слоты и вещи: `{slots: [{id, label, kind, builtIn, items}]}` |
| GET | `/api/users/me/pet` | имя, образ, вычисленные `mood` и `status` |
| PUT | `/api/users/me/pet` | заменить образ целиком: `{activity, outfit}` |
| PUT | `/api/users/me/pet/slots/{slot}` | `{item}` — надеть; `{item: null}` — снять |
| PUT | `/api/users/me/pet/name` | `{name}` — переименовать |
| GET | `/api/users/{id}/pet` | чужой бобр: имя и образ, `mood = idle`, без `status` |

```json
{"activity": "hockey", "outfit": {"shirt": "hc-sokol", "hat": "helmet", "bottom": "hockeypants"}}
```

Ответ владельцу:

```json
{
  "name": "Бублик",
  "mood": "thinking",
  "activity": "hockey",
  "outfit": {"shirt": "hc-sokol", "hat": "helmet", "bottom": "hockeypants"},
  "status": {
    "mood": "thinking",
    "message": "Жду ответа по «Хоккей во дворе»",
    "reason": "AWAITING_APPROVAL",
    "eventId": "a11680eb-…",
    "eventTitle": "Хоккей во дворе"
  }
}
```

- Отсутствующий слот в `outfit` или `null` снимает вещь. Неизвестные слоты и вещи — `400`, сохранение
  атомарное.
- Надеть можно только своё: `409 «Вещь «Кепка» ещё не твоя: купи её в магазине за 60 монет»`.
- Базовые вещи есть у всех: `activity:none`, `shirt:training`, `hat:headband`.
- Имя — 1–30 символов после схлопывания пробелов, иначе `400 «Имя питомца — от 1 до 30 символов»`.
  Пустое в базе — «Бублик».
- Новый пользователь без действий — `sleep`, без гардероба — `activity = none`, `outfit = {}`.

---

## 2. Магазин

| Метод | Путь | Что |
|---|---|---|
| GET | `/api/pets/shop` | вещи: `id` (`слот:код`), `price`, `kind` (`BASE`, `SHOP`, `EXCLUSIVE`), `owned`, `hint`, `isNew`, `legendary` |
| POST | `/api/pets/shop/{слот:код}/buy` | купить вещь |
| GET | `/api/pets/shop/bundles` | 48 комплектов в 14 категориях: цена, скидка, сколько не хватает, заблокирован ли |
| POST | `/api/pets/shop/bundles/{code}/buy` | докупить недостающее и надеть комплект целиком |
| POST | `/api/pets/shop/buy-set` | `{items: ["hat:cap", …], wear}` — купить примеренное одной операцией |

- Скидка 20% на сумму недостающих вещей, если их две и больше; округление вниз.
- Эксклюзив купить нельзя — его дают за достижение: `409 «Эту вещь нельзя купить — её дают за …»`.
- Не хватает монет: `409 «Не хватает монет: нужно 150, у тебя 90»`. Уже есть: `409 «Эта вещь уже у тебя»`.
- `buy-set`: дубли убираются, две вещи в одном слоте — `400`, всё в одной транзакции и одной записи журнала.
  `wear = true` объединяет выбранное с текущим образом.
- Повторное надевание своего комплекта бесплатно.

Категории комплектов: `football` (общий и 11 клубов), `hockey` (общий и 9 клубов), `basketball`,
`running`, `volleyball`, `rackets`, `fitness`, `cycling`, `winter`, `water`, `martial`, `esports`, `chess`,
`casual`.

---

## 3. Сохранённые образы

| Метод | Путь | Что |
|---|---|---|
| GET | `/api/users/me/pet/looks` | мои образы в порядке создания |
| POST | `/api/users/me/pet/looks` | `{name, activity, outfit}`; не больше 4, только свои вещи |
| DELETE | `/api/users/me/pet/looks/{id}` | 204; чужой — 404 |

Сохранение не меняет надетое. Надеть сохранённый образ — обычный `PUT /api/users/me/pet`. Примерка в
гардеробе (`/profile/wardrobe`, `/profile/shop`) локальная — в API ничего не пишется до покупки.

---

## 4. Настроение

Вычисляется `PetMoodService` на каждый запрос, не хранится. Первое совпадение побеждает:

| # | Условие | `mood` / `reason` | Фраза |
|---|---|---|---|
| 1 | мою встречу сняли или удалили за 7 дней | `offended` / `ORGANIZED_EVENT_MODERATED` | Мою встречу «…» сняли: <причина> |
| 2 | встречу, куда я записан, сняли за 7 дней | `sad` / `REGISTERED_EVENT_MODERATED` | Встречу «…» отменили: <причина> |
| 3 | заявку отклонили за 3 дня | `sad` / `REGISTRATION_REJECTED` | Не взяли на «…»: <причина> |
| 4 | заявку приняли за 24 часа | `wink` / `REGISTRATION_APPROVED` | Меня приняли на «…»! |
| 5 | моя встреча в ближайшие 48 часов | `happy` / `EVENT_SOON` | Скоро «…» — завтра в 19:00! |
| 6 | новые заявки на мою встречу | `surprised` / `NEW_REQUESTS` | 3 новые заявки на «…» |
| 7 | жду решения по своей заявке | `thinking` / `AWAITING_APPROVAL` | Жду ответа по «…» |
| 8 | ничего впереди и ничего за 14 дней | `sleep` / `INACTIVE` | Давно не тренировались… Найдём компанию? |
| 9 | остальное | `idle` / `DEFAULT` | Ближайшая встреча: «…» |

Плюс сообщения о наградах за последние сутки: `COINS_EARNED` и `ACHIEVEMENT_EARNED`, достижение важнее
монет. Внутри правила берётся самое свежее решение или ближайшее занятие; у серий — ближайшее
`SCHEDULED`. Дата и время — в поясе встречи, по умолчанию `Asia/Krasnoyarsk`.

---

## 5. Значения

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
| `outfit.feet` | `sneakers` |
| `outfit.shirt` | `football`, `running`, `training`, `judo`, `hockey`, `programming`, `basketball`, `volleyball`, `polo`, `hoodie`, `tracksuit`, `puffer` |
| `outfit.shirt`, футбольные клубы | `zenit`, `cska`, `fakel`, `yenisey`, `krasnodar`, `lokomotiv`, `spartak`, `rostov`, `dynamo`, `akron`, `beavers` |
| `outfit.shirt`, хоккейные клубы | `hc-cska`, `hc-metallurg`, `hc-lokomotiv`, `hc-severstal`, `hc-torpedo`, `hc-barys`, `hc-spartak`, `hc-neftekhimik`, `hc-sokol` |

Значения чувствительны к регистру, выпущенные коды не переименовываются. Футбольный и хоккейный клуб с
одним названием — разные коды (`lokomotiv` и `hc-lokomotiv`). Слота фона нет: бобр рисуется на прозрачном
фоне (миграция V40).

---

## 6. Хранение и демо

| Что | Где |
|---|---|
| имя | `users.pet_name` |
| слоты и вещи | `pet_slots`, `pet_items` |
| сохранённые образы | `pet_saved_looks`, одежда — `pet_saved_look_outfit` |

Встроенный каталог создаётся при старте идемпотентно, поэтому есть и в H2 без Flyway.

В демо Анна, Пётр и Ольга покупают вещи на заработанные монеты, Виктория скупает весь магазин, эксклюзивы
выдаются достижениями.
