# Иллюстрации видов спорта

Картинки для карточек событий и справочника. Сгенерированы генератором изображений по единому промпту, лежат в ресурсах бэка и отдаются API.

## Как устроено

- Файлы: `backend/src/main/resources/sport-images/<slug>.webp`, 640×640, 11–31 КБ. Сейчас 30 картинок: 27 видов справочника (`V3` и `V9`), «Зарядка» и «Петанк» из демо-данных и общая `default`.
- Отдельного эндпоинта нет: файлы раздаются как статика по `/api/sport-images/<slug>.webp` (`SportImagesConfig`), без входа, с кешем на неделю. Префикс `/api`, потому что Caddy проксирует на бэк только его.
- Ссылку собирает `util/SportImages` при сборке ответа: есть файл для slug — ссылка на него, нет (например, пользователь ввёл новый вид) — на `default.webp`. Проверка наличия файла кешируется, в базу за картинкой никто не ходит.
- Каждый `SportResponse` (справочник, лента, карточка, админка) содержит `imageUrl`. На фронте достаточно `<img src={sport.imageUrl} alt={sport.name} />`.
- **Новый вид спорта кода не требует:** положить `<slug>.webp` в папку. У своих видов slug — нормализованное название через дефис, поэтому файлы `зарядка.webp` и `петанк.webp` названы по-русски.

## Как сгенерировать новую картинку

1. Стиль — общий для всех картинок, менять его нельзя, иначе лента станет разношёрстной:

```text
ILLUSTRATION STYLE: minimal flat illustration, simple bold shapes. Clean black outlines of even weight, no texture, no grain, no shading except one flat black shadow shape where needed. Max 3 colors per image from: lemon yellow #FFE14D, electric blue #3D5AFE, tomato red #FF5A3C, plus black and white. 1–2 people only, simplified faces (few lines), calm friendly poses, no exaggerated motion. Plain single-color background, no city, no fence, no crowd, no extra objects — only what tells the sport (a ball, a chessboard, a mat). Lots of empty space. Modern, clean, like an icon-style editorial illustration. No text, no letters, no logos. Square 1:1 composition, subject centered.
```

2. Сцена — одна фраза: кто, что делает, ракурс, цвет фона и 1–2 акцента из палитры. Фоны чередуются между жёлтым, синим и красным.
3. Сгенерировать квадратную картинку по промпту «стиль + сцена». Готовая команда для агента — в `AGENTS.md`, раздел «Иллюстрации видов спорта».

4. Конвертация в WebP 640×640 (Pillow): обрезать по центру до квадрата, `resize((640, 640), LANCZOS)`, `save(..., "WEBP", quality=82, method=6)`.
5. Положить в `sport-images/`, перезапустить бэк и открыть `/api/sport-images/<slug>.webp`.

Одна картинка генерируется 3–5 минут; несколько можно запускать параллельно.

## Сцены текущих картинок

| slug | Сцена |
|---|---|
| `football` | One person gently kicking a football, side view, lemon yellow background, blue shirt, white-and-black ball. |
| `basketball` | One person dribbling a basketball, three-quarter view, electric blue background, yellow jersey, tomato red ball. |
| `volleyball` | One person setting a volleyball with both hands above the head, front view, tomato red background, yellow shirt, white ball. |
| `running` | One person running, side view, blue background, yellow sneakers. |
| `cycling` | One person riding a simple bicycle, side view, lemon yellow background, blue bicycle, red helmet. |
| `tennis` | One person holding a tennis racket ready to hit a small ball, side view, electric blue background, red shirt, yellow ball. |
| `table_tennis` | One person with a ping-pong paddle next to a small table-tennis table, three-quarter view, tomato red background, blue table with white line, yellow ball. |
| `swimming` | One person swimming freestyle, head and one arm above water, side view, electric blue background as water with a few white wave lines, yellow swim cap. |
| `yoga` | One person standing in a calm tree pose on a mat, front view, lemon yellow background, blue mat, red top. |
| `chess` | One person sitting at a small table thinking over a black-and-white chessboard, one hand near a chess piece, three-quarter view, electric blue background, yellow sweater. |
| `зарядка` | One older person doing a gentle morning stretch with arms raised, front view, lemon yellow background, red top, blue trousers. |
| `петанк` | One person tossing a metal petanque ball underhand, a small red target ball on the ground, side view, electric blue background, yellow shirt. |
| `default` | Two people giving each other a friendly high five, side view, tomato red background, one in yellow and one in blue. |
| `sport_programming` | One person focused, typing on a laptop at a simple desk, a small trophy cup next to the laptop, three-quarter view, lemon yellow background, blue laptop, red sweater. |
| `esports` | One person sitting at a desk in front of a computer monitor, wearing a gaming headset, hand on a mouse, three-quarter view, tomato red background, blue monitor, yellow headset. |
| `drone_racing` | One person standing and holding a remote controller with both hands, a small quadcopter drone flying above, three-quarter view, electric blue background, yellow drone, red controller. |
| `robotics` | One person kneeling next to a small wheeled robot on the floor, adjusting it with one hand, three-quarter view, lemon yellow background, blue robot, red shirt. |
| `paralympic` | One athlete racing in a sports wheelchair, side view, confident and calm, tomato red background, blue wheelchair, yellow shirt. |
| `hockey` | One ice hockey player in a helmet holding a hockey stick near a black puck, side view, electric blue background, red jersey, yellow helmet. |
| `skiing` | One person cross-country skiing with two poles, side view, lemon yellow background, red jacket, blue skis. |
| `skating` | One person ice skating gracefully, side view, arms slightly open, electric blue background, red sweater, white skates. |
| `fitness` | One person lifting a dumbbell in a calm biceps curl, front view, tomato red background, yellow top, blue dumbbell. |
| `workout` | One person doing a pull-up on a simple horizontal bar, front view, lemon yellow background, blue shirt, red shorts. |
| `boxing` | One person in a calm boxing guard stance wearing boxing gloves, three-quarter view, electric blue background, red gloves, yellow shorts. |
| `martial_arts` | One person in a white kimono with a black belt standing in a calm martial-arts stance, front view, tomato red background, white kimono. |
| `badminton` | One person hitting a shuttlecock with a badminton racket, side view, lemon yellow background, blue shirt, red racket. |
| `climbing` | One person climbing a simple wall with a few colorful round holds, back three-quarter view, electric blue background, yellow shirt, red holds. |
| `dance` | Two people dancing together holding hands, calm and joyful, side view, tomato red background, one in yellow and one in blue. |
| `nordic_walking` | One older person walking with two nordic walking poles, side view, smiling, lemon yellow background, blue jacket, red cap. |
| `checkers` | One person sitting at a small table playing checkers, one hand moving a piece, black and red pieces on a board, three-quarter view, electric blue background, yellow sweater. |

## Достижения и награды организаций

Тот же стиль и та же генерация. Файлы — `backend/src/main/resources/achievement-images/<код>.webp`: у достижений людей код `AchievementCode` в нижнем регистре, у наград организаций — `org_` + `OrganizationAwardKind` (у «Организации месяца» префикс не удваивается: `org_of_month`). Раздаются как статика по `/api/achievement-images/…`; ссылку отдают `AchievementResponse.imageUrl` и `AwardBadgeResponse.imageUrl` (`util/AchievementImages`). Новое достижение без файла даст битую картинку — файл добавлять вместе с кодом.

| Файл | Сцена |
|---|---|
| `first_step` | One person confidently taking a first step over a simple start line on the ground, side view, sneakers, lemon yellow background, blue shirt, red sneakers. |
| `versatile` | One person happily holding three sports items at once: a football under one arm, a tennis racket in one hand and a big chess knight piece in the other, front view, electric blue background, yellow shirt. |
| `regular` | One person proudly holding a big gold medal on a ribbon against the chest, smiling, front view, tomato red background, yellow medal, blue shirt. |
| `team_builder` | One person waving to invite a second person who is walking towards them, a ball under the first person's arm, side view, lemon yellow background, one in blue and one in red. |
| `soul_of_company` | One cheerful organizer wearing a small golden crown and a whistle on a cord, holding a clipboard, front view, electric blue background, yellow crown, red top. |
| `own_beaver` | One person in a blue t-shirt hugging a friendly round cartoon beaver mascot of the same height, both smiling, front view, tomato red background, brown beaver with big white front teeth. |
| `org_first_meeting` | One organizer holding a small pennant flag and warmly greeting a first participant who just arrived with a sports bag, side view, lemon yellow background, organizer in blue, participant in red. |
| `org_participants_100` | One happy organizer throwing a big burst of round confetti pieces into the air with both hands, front view, electric blue background, yellow and red confetti, yellow top. |
| `org_returning_20` | Two friends meeting again and shaking hands warmly, both with sports bags on their shoulders, side view, tomato red background, one in yellow and one in blue. |
| `org_of_month` | One organizer proudly lifting a big golden trophy cup above the head with both hands, front view, lemon yellow background, golden trophy, blue top. |
