-- Приглашения в соорганизаторы: автор зовёт, человек принимает или отказывается.
-- Одна строка на пару (мероприятие, пользователь): повторное приглашение переиспользует её.
CREATE TABLE organizer_invitations (
    id            UUID PRIMARY KEY,
    event_id      UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    invited_by_id UUID        NOT NULL REFERENCES users (id),
    status        VARCHAR(16) NOT NULL,
    decided_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_organizer_invitations_event_user UNIQUE (event_id, user_id)
);

CREATE INDEX ix_organizer_invitations_user_status ON organizer_invitations (user_id, status);
