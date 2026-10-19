-- Обсуждение под мероприятием: вопросы участников и ответы организатора. Чатов нет, только комментарии.
CREATE TABLE comments (
    id         UUID PRIMARY KEY,
    event_id   UUID          NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    author_id  UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    text       VARCHAR(2000) NOT NULL,
    hidden     BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ   NOT NULL,
    updated_at TIMESTAMPTZ   NOT NULL
);
CREATE INDEX ix_comments_event_created ON comments (event_id, created_at);
