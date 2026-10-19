-- Уровня «Опытный» (ADVANCED) больше нет в EventLevel и SportLevel: оставшиеся строки становятся «Любителем».
-- Иначе Hibernate падает при чтении: No enum constant ...EventLevel.ADVANCED.
UPDATE events SET level = 'AMATEUR' WHERE level = 'ADVANCED';
UPDATE user_sports SET level = 'AMATEUR' WHERE level = 'ADVANCED';
