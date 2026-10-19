-- Свои вещи бобра от админа: PNG или SVG разбирает pet_item_import.py в безопасный SVG из контуров.
-- Хранится готовый рисунок (сдвинут в 0,0) и параметры посадки: translate(fit_x fit_y) scale(fit_scale)
-- в координатах рисунка бобра. У встроенных вещей (рисует фронт) все колонки пустые.
ALTER TABLE pet_items ADD COLUMN body_part VARCHAR(20);
ALTER TABLE pet_items ADD COLUMN svg VARCHAR(400000);
ALTER TABLE pet_items ADD COLUMN fit_x DOUBLE PRECISION;
ALTER TABLE pet_items ADD COLUMN fit_y DOUBLE PRECISION;
ALTER TABLE pet_items ADD COLUMN fit_scale DOUBLE PRECISION;
