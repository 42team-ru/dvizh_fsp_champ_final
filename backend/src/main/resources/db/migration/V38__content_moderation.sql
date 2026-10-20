-- Модерация текстов: одна проверка на объект (сообщение, мероприятие, профиль, анкета), очередь для администратора.
CREATE TABLE moderation_checks (
    id UUID PRIMARY KEY,
    target_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    event_id UUID REFERENCES events (id) ON DELETE CASCADE,
    author_id UUID REFERENCES users (id) ON DELETE SET NULL,
    text_snapshot VARCHAR(12000) NOT NULL,
    status VARCHAR(20) NOT NULL,
    source VARCHAR(20),
    severity INTEGER NOT NULL DEFAULT 0 CHECK (severity BETWEEN 0 AND 3),
    explanation VARCHAR(500),
    attempts INTEGER NOT NULL DEFAULT 0,
    checked_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by_id UUID REFERENCES users (id) ON DELETE SET NULL,
    decision VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_moderation_checks_target UNIQUE (target_type, target_id)
);
CREATE INDEX ix_moderation_checks_status ON moderation_checks (status, updated_at);

CREATE TABLE moderation_check_categories (
    check_id UUID NOT NULL REFERENCES moderation_checks (id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL,
    PRIMARY KEY (check_id, category)
);
