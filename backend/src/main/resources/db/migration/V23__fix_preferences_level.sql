-- V21 убрал уровень «Опытный» (ADVANCED) из событий и интересов, но забыл предпочтения онбординга:
-- такая строка роняла GET /api/users/me/preferences (No enum constant SportLevel.ADVANCED).
UPDATE user_preferences SET level = 'AMATEUR' WHERE level = 'ADVANCED';

ALTER TABLE user_preferences DROP CONSTRAINT IF EXISTS user_preferences_level_check;
ALTER TABLE user_preferences ADD CONSTRAINT ck_user_preferences_level CHECK (level IN ('BEGINNER', 'AMATEUR', 'PRO'));
