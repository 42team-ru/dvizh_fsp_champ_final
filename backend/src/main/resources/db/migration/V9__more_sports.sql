-- Расширение справочника: цифровой спорт, паралимпийский, зимние, силовые и популярные любительские виды.
-- Иллюстрации к ним — sport-images/<slug>.webp (docs/sport-images.md).
CREATE TEMP TABLE new_sports (name VARCHAR(100), normalized_name VARCHAR(100), slug VARCHAR(100)) ON COMMIT DROP;
INSERT INTO new_sports (name, normalized_name, slug) VALUES
    ('Спортивное программирование', 'спортивное программирование', 'sport_programming'),
    ('Киберспорт', 'киберспорт', 'esports'),
    ('Дрон-рейсинг', 'дрон-рейсинг', 'drone_racing'),
    ('Спортивная робототехника', 'спортивная робототехника', 'robotics'),
    ('Паралимпийский спорт', 'паралимпийский спорт', 'paralympic'),
    ('Хоккей', 'хоккей', 'hockey'),
    ('Лыжные гонки', 'лыжные гонки', 'skiing'),
    ('Катание на коньках', 'катание на коньках', 'skating'),
    ('Фитнес', 'фитнес', 'fitness'),
    ('Воркаут', 'воркаут', 'workout'),
    ('Бокс', 'бокс', 'boxing'),
    ('Единоборства', 'единоборства', 'martial_arts'),
    ('Бадминтон', 'бадминтон', 'badminton'),
    ('Скалолазание', 'скалолазание', 'climbing'),
    ('Танцы', 'танцы', 'dance'),
    ('Скандинавская ходьба', 'скандинавская ходьба', 'nordic_walking'),
    ('Шашки', 'шашки', 'checkers');

-- Если пользователь уже завёл такой вид сам, не дублируем: запись становится справочной и получает латинский slug.
UPDATE sports s
SET custom = FALSE, name = n.name, slug = n.slug, updated_at = now()
FROM new_sports n
WHERE s.normalized_name = n.normalized_name;

INSERT INTO sports (id, name, normalized_name, slug)
SELECT gen_random_uuid(), name, normalized_name, slug FROM new_sports
ON CONFLICT DO NOTHING;
