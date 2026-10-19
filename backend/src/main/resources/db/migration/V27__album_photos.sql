-- Альбом профиля: фото с занятий лежат в files (kind = ALBUM_PHOTO, event_id — папка), у них есть подпись.
-- Была V22__album_photos: номер 22 уже занят V22__album, переименовано в 27. IF NOT EXISTS — на случай,
-- если у кого-то она успела примениться под старым номером.
ALTER TABLE files ADD COLUMN IF NOT EXISTS caption VARCHAR(300);
CREATE INDEX IF NOT EXISTS ix_files_album ON files (uploaded_by_id, kind, created_at);
