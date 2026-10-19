-- Альбом профиля: фото с занятий лежат в files (kind = ALBUM_PHOTO, event_id — папка), у них есть подпись.
ALTER TABLE files ADD COLUMN caption VARCHAR(300);
CREATE INDEX ix_files_album ON files (uploaded_by_id, kind, created_at);
