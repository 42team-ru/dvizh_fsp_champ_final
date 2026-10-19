-- Настроение вычисляется, каталог содержит только встроенный гардероб и инвентарь.
-- Внешние ключи ON DELETE CASCADE снимают вещи со всех пользователей.
DELETE FROM pet_items WHERE NOT built_in;
DELETE FROM pet_slots WHERE NOT built_in OR code = 'mood' OR kind = 'MOOD';
ALTER TABLE pet_items DROP COLUMN image_file_id;

-- Старые файлы оставляем: ссылки /api/files/{id} могут быть сохранены в профилях
-- или внешних системах; SQL-миграция также не может согласованно удалить объекты S3.
