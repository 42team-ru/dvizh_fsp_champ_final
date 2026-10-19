-- Модерация обсуждений: админ скрывает некорректное сообщение с причиной, само мероприятие и остальные сообщения остаются.
ALTER TABLE comments ADD COLUMN hidden_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN hidden_by_id UUID REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE comments ADD COLUMN hide_reason VARCHAR(1000);

-- Спортивные интересы организации: какими видами спорта она занимается (ТЗ: «деятельность и спортивные интересы»).
CREATE TABLE organization_sports (
    id              UUID PRIMARY KEY,
    organization_id UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    sport_id        UUID        NOT NULL REFERENCES sports (id),
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_organization_sports_org_sport UNIQUE (organization_id, sport_id)
);
