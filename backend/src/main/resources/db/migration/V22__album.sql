-- Альбом: фото человека с мероприятий, где он был участником или организатором.
-- Файл лежит в files (kind = ALBUM_PHOTO, event_id заполнен), здесь — привязка, подпись и порядок показа.
CREATE TABLE album_photos (
    id         UUID PRIMARY KEY,
    user_id    UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id   UUID          NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    file_id    UUID          NOT NULL UNIQUE REFERENCES files (id) ON DELETE CASCADE,
    caption    VARCHAR(300),
    created_at TIMESTAMPTZ   NOT NULL,
    updated_at TIMESTAMPTZ   NOT NULL
);
CREATE INDEX ix_album_photos_user ON album_photos (user_id, created_at DESC);
CREATE INDEX ix_album_photos_event ON album_photos (event_id, created_at);
