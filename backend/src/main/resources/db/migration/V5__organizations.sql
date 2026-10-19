-- Анкета организации: одна на аккаунт роли ORG. Статус допуска меняет только админ.
CREATE TABLE organizations (
    id             UUID PRIMARY KEY,
    account_id     UUID          NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
    name           VARCHAR(200)  NOT NULL,
    description    VARCHAR(5000) NOT NULL,
    city           VARCHAR(100),
    status         VARCHAR(20)   NOT NULL,
    reject_reason  VARCHAR(1000),
    submitted_at   TIMESTAMPTZ   NOT NULL,
    reviewed_at    TIMESTAMPTZ,
    reviewed_by_id UUID REFERENCES users (id),
    created_at     TIMESTAMPTZ   NOT NULL,
    updated_at     TIMESTAMPTZ   NOT NULL
);
CREATE INDEX ix_organizations_status ON organizations (status);

-- Контакты: не больше одного значения каждого типа (телефон, почта, telegram и т.д.).
CREATE TABLE organization_contacts (
    organization_id UUID         NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    contact_type    VARCHAR(20)  NOT NULL,
    contact_value   VARCHAR(255) NOT NULL,
    PRIMARY KEY (organization_id, contact_type)
);

ALTER TABLE events ADD CONSTRAINT fk_events_organization
    FOREIGN KEY (organization_id) REFERENCES organizations (id);
