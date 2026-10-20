-- Фоны бобра убраны из продукта. Слот «Фон» удаляется вместе с вещами; купленное и надетое уходит каскадом
-- (pet_items → user_items, user_pet_equipment), а в сохранённых образах строки слота чистим сами.
delete from pet_saved_look_outfit where slot_code = 'background';
delete from pet_slots where code = 'background';
