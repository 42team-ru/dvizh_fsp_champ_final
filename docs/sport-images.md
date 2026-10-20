# Иллюстрации видов спорта и достижений

Картинки в одном плоском стиле: карточки встреч без фото, справочник, достижения и награды клубов.
Лежат в ресурсах бэкенда, раздаются как статика.

| Что                  | Файлы                                                      | Адрес                                |
|----------------------|------------------------------------------------------------|--------------------------------------|
| виды спорта          | `backend/src/main/resources/sport-images/<slug>.webp`      | `/api/sport-images/<slug>.webp`      |
| достижения и награды | `backend/src/main/resources/achievement-images/<код>.webp` | `/api/achievement-images/<код>.webp` |

- 640×640, WebP, 11–31 КБ. Без входа, кеш на неделю. Префикс `/api` — потому что Caddy проксирует на
  бэкенд только его.
- Ссылку собирает `util/SportImages`: есть файл для slug — ссылка на него, нет — на `default.webp`.
  Каждый `SportResponse` содержит `imageUrl` и `imageFocus` — точку на голове персонажа, по которой
  обрезаются превью.
- **Новый вид кода не требует** — достаточно положить `<slug>.webp`. У своих видов slug — нормализованное
  название, поэтому `зарядка.webp` и `петанк.webp` названы по-русски.
- Картинка, загруженная админом, главнее встроенной ([admin-sports.md](admin-sports.md)).
- Код достижения — `AchievementCode` в нижнем регистре, награды клуба — `org_` + `OrganizationAwardKind`
  (`org_of_month` без двойного префикса). Новое достижение без файла даст битую картинку.

---

## Как сделать новую

1. Стиль — общий, менять нельзя, иначе лента станет разношёрстной:

   ```text
   ILLUSTRATION STYLE: minimal flat illustration, simple bold shapes. Clean black outlines of even weight,
   no texture, no grain, no shading except one flat black shadow shape where needed. Max 3 colors per image
   from: lemon yellow #FFE14D, electric blue #3D5AFE, tomato red #FF5A3C, plus black and white. 1–2 people
   only, simplified faces (few lines), calm friendly poses, no exaggerated motion. Plain single-color
   background, no city, no fence, no crowd, no extra objects — only what tells the sport (a ball, a
   chessboard, a mat). Lots of empty space. Modern, clean, like an icon-style editorial illustration.
   No text, no letters, no logos. Square 1:1 composition, subject centered.
   ```

2. Сцена — одна фраза: кто, что делает, ракурс, фон и 1–2 акцента из палитры. Фоны чередуются: жёлтый,
   синий, красный.
3. Сгенерировать квадрат по «стиль + сцена».
4. В WebP (Pillow): обрезать по центру до квадрата, `resize((640, 640), LANCZOS)`,
   `save(..., "WEBP", quality=82, method=6)`.
5. Положить в папку, перезапустить бэкенд, открыть `/api/sport-images/<slug>.webp`. Точку фокуса добавить в
   таблицу `SportImages`.

---

## Сцены

| Файл                   | Сцена                                                                                                                                                                                                       |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `football`             | One person gently kicking a football, side view, lemon yellow background, blue shirt, white-and-black ball.                                                                                                 |
| `basketball`           | One person dribbling a basketball, three-quarter view, electric blue background, yellow jersey, tomato red ball.                                                                                            |
| `volleyball`           | One person setting a volleyball with both hands above the head, front view, tomato red background, yellow shirt, white ball.                                                                                |
| `running`              | One person running, side view, blue background, yellow sneakers.                                                                                                                                            |
| `cycling`              | One person riding a simple bicycle, side view, lemon yellow background, blue bicycle, red helmet.                                                                                                           |
| `tennis`               | One person holding a tennis racket ready to hit a small ball, side view, electric blue background, red shirt, yellow ball.                                                                                  |
| `table_tennis`         | One person with a ping-pong paddle next to a small table-tennis table, three-quarter view, tomato red background, blue table with white line, yellow ball.                                                  |
| `swimming`             | One person swimming freestyle, head and one arm above water, side view, electric blue background as water with a few white wave lines, yellow swim cap.                                                     |
| `yoga`                 | One person standing in a calm tree pose on a mat, front view, lemon yellow background, blue mat, red top.                                                                                                   |
| `chess`                | One person sitting at a small table thinking over a black-and-white chessboard, one hand near a chess piece, three-quarter view, electric blue background, yellow sweater.                                  |
| `зарядка`              | One older person doing a gentle morning stretch with arms raised, front view, lemon yellow background, red top, blue trousers.                                                                              |
| `петанк`               | One person tossing a metal petanque ball underhand, a small red target ball on the ground, side view, electric blue background, yellow shirt.                                                               |
| `default`              | Two people giving each other a friendly high five, side view, tomato red background, one in yellow and one in blue.                                                                                         |
| `sport_programming`    | One person focused, typing on a laptop at a simple desk, a small trophy cup next to the laptop, three-quarter view, lemon yellow background, blue laptop, red sweater.                                      |
| `esports`              | One person sitting at a desk in front of a computer monitor, wearing a gaming headset, hand on a mouse, three-quarter view, tomato red background, blue monitor, yellow headset.                            |
| `drone_racing`         | One person standing and holding a remote controller with both hands, a small quadcopter drone flying above, three-quarter view, electric blue background, yellow drone, red controller.                     |
| `robotics`             | One person kneeling next to a small wheeled robot on the floor, adjusting it with one hand, three-quarter view, lemon yellow background, blue robot, red shirt.                                             |
| `paralympic`           | One athlete racing in a sports wheelchair, side view, confident and calm, tomato red background, blue wheelchair, yellow shirt.                                                                             |
| `hockey`               | One ice hockey player in a helmet holding a hockey stick near a black puck, side view, electric blue background, red jersey, yellow helmet.                                                                 |
| `skiing`               | One person cross-country skiing with two poles, side view, lemon yellow background, red jacket, blue skis.                                                                                                  |
| `skating`              | One person ice skating gracefully, side view, arms slightly open, electric blue background, red sweater, white skates.                                                                                      |
| `fitness`              | One person lifting a dumbbell in a calm biceps curl, front view, tomato red background, yellow top, blue dumbbell.                                                                                          |
| `workout`              | One person doing a pull-up on a simple horizontal bar, front view, lemon yellow background, blue shirt, red shorts.                                                                                         |
| `boxing`               | One person in a calm boxing guard stance wearing boxing gloves, three-quarter view, electric blue background, red gloves, yellow shorts.                                                                    |
| `martial_arts`         | One person in a white kimono with a black belt standing in a calm martial-arts stance, front view, tomato red background, white kimono.                                                                     |
| `badminton`            | One person hitting a shuttlecock with a badminton racket, side view, lemon yellow background, blue shirt, red racket.                                                                                       |
| `climbing`             | One person climbing a simple wall with a few colorful round holds, back three-quarter view, electric blue background, yellow shirt, red holds.                                                              |
| `dance`                | Two people dancing together holding hands, calm and joyful, side view, tomato red background, one in yellow and one in blue.                                                                                |
| `nordic_walking`       | One older person walking with two nordic walking poles, side view, smiling, lemon yellow background, blue jacket, red cap.                                                                                  |
| `checkers`             | One person sitting at a small table playing checkers, one hand moving a piece, black and red pieces on a board, three-quarter view, electric blue background, yellow sweater.                               |
| `first_step`           | One person confidently taking a first step over a simple start line on the ground, side view, sneakers, lemon yellow background, blue shirt, red sneakers.                                                  |
| `versatile`            | One person happily holding three sports items at once: a football under one arm, a tennis racket in one hand and a big chess knight piece in the other, front view, electric blue background, yellow shirt. |
| `regular`              | One person proudly holding a big gold medal on a ribbon against the chest, smiling, front view, tomato red background, yellow medal, blue shirt.                                                            |
| `team_builder`         | One person waving to invite a second person who is walking towards them, a ball under the first person's arm, side view, lemon yellow background, one in blue and one in red.                               |
| `soul_of_company`      | One cheerful organizer wearing a small golden crown and a whistle on a cord, holding a clipboard, front view, electric blue background, yellow crown, red top.                                              |
| `own_beaver`           | One person in a blue t-shirt hugging a friendly round cartoon beaver mascot of the same height, both smiling, front view, tomato red background, brown beaver with big white front teeth.                   |
| `org_first_meeting`    | One organizer holding a small pennant flag and warmly greeting a first participant who just arrived with a sports bag, side view, lemon yellow background, organizer in blue, participant in red.           |
| `org_participants_100` | One happy organizer throwing a big burst of round confetti pieces into the air with both hands, front view, electric blue background, yellow and red confetti, yellow top.                                  |
| `org_returning_20`     | Two friends meeting again and shaking hands warmly, both with sports bags on their shoulders, side view, tomato red background, one in yellow and one in blue.                                              |
| `org_of_month`         | One organizer proudly lifting a big golden trophy cup above the head with both hands, front view, lemon yellow background, golden trophy, blue top.                                                         |
