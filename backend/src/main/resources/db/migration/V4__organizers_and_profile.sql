-- Профиль пользователя: показывается в карточке организатора и участника
ALTER TABLE users ADD COLUMN bio VARCHAR(1000);
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
ALTER TABLE users ADD COLUMN city VARCHAR(100);

-- Соорганизаторы: автор добавляет людей, которые вместе с ним правят мероприятие и решают заявки
CREATE TABLE event_organizers (
    id          UUID PRIMARY KEY,
    event_id    UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    added_by_id UUID        NOT NULL REFERENCES users (id),
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_event_organizers_event_user UNIQUE (event_id, user_id)
);
CREATE INDEX ix_event_organizers_user ON event_organizers (user_id);
