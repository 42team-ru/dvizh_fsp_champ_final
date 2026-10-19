-- Альбом профиля: фото с занятий лежат в files (kind = ALBUM_PHOTO, event_id — папка), у них есть подпись.
-- Была V22__album_photos: столкнулась по номеру с V22__album, и Flyway не стартовал. IF NOT EXISTS — для баз,
-- где её успели применить под старым номером.
ALTER TABLE files ADD COLUMN IF NOT EXISTS caption VARCHAR(300);
CREATE INDEX IF NOT EXISTS ix_files_album ON files (uploaded_by_id, kind, created_at);
