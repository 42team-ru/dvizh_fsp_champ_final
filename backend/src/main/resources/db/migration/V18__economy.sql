-- Экономика: монеты за реальные встречи, магазин и инвентарь бобра, достижения, «Организация месяца».

-- Баланс монет (кэш суммы журнала coin_ledger).
ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD CONSTRAINT ck_users_coins CHECK (coins >= 0);

-- Служебный код особой организации (например, «Хищные бобры» для достижения «Свой бобр»); задаётся не через API.
ALTER TABLE organizations ADD COLUMN code VARCHAR(40);
ALTER TABLE organizations ADD CONSTRAINT uq_organizations_code UNIQUE (code);
UPDATE organizations SET code = 'predatory-beavers' WHERE name = 'ССК ВГУ «Хищные бобры»';

-- Занятие уже обработано начислением наград. Уже прошедшие занятия считаем обработанными: задним числом не платим.
ALTER TABLE event_occurrences ADD COLUMN reward_processed_at TIMESTAMPTZ;
UPDATE event_occurrences SET reward_processed_at = now() WHERE start_at < now();
CREATE INDEX ix_event_occurrences_reward_pending ON event_occurrences (start_at) WHERE reward_processed_at IS NULL;

-- Цена и вид вещи; сами значения проставляет PetCatalogService при старте.
ALTER TABLE pet_items ADD COLUMN price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE pet_items ADD COLUMN kind VARCHAR(20) NOT NULL DEFAULT 'SHOP';
ALTER TABLE pet_items ADD COLUMN unlock_hint VARCHAR(200);
-- Свои вещи от админа (V17) продаются в магазине по цене по умолчанию.
UPDATE pet_items SET price = 100 WHERE built_in = FALSE;

-- Журнал монет. ref_key уникален: одна и та же награда никогда не начисляется дважды.
CREATE TABLE coin_ledger (
    id            UUID PRIMARY KEY,
    user_id       UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    amount        INTEGER      NOT NULL,
    kind          VARCHAR(30)  NOT NULL,
    ref_key       VARCHAR(200) NOT NULL,
    note          VARCHAR(300) NOT NULL,
    event_id      UUID REFERENCES events (id) ON DELETE SET NULL,
    occurrence_id UUID REFERENCES event_occurrences (id) ON DELETE SET NULL,
    occurred_at   TIMESTAMPTZ  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_coin_ledger_ref_key UNIQUE (ref_key)
);
CREATE INDEX ix_coin_ledger_user_occurred ON coin_ledger (user_id, occurred_at DESC);

-- Инвентарь: купленные и выданные вещи. Базовые вещи есть у всех и сюда не пишутся.
CREATE TABLE user_items (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    item_id    UUID        NOT NULL REFERENCES pet_items (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_user_items_user_item UNIQUE (user_id, item_id)
);
-- Уже надетое остаётся у владельца.
INSERT INTO user_items (id, user_id, item_id, created_at, updated_at)
SELECT gen_random_uuid(), user_id, item_id, now(), now() FROM user_pet_equipment
ON CONFLICT DO NOTHING;

-- Полученные достижения; created_at — когда получено.
CREATE TABLE user_achievements (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code       VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_user_achievements_user_code UNIQUE (user_id, code)
);

-- Награды организаций (монет и вещей нет). ORG_OF_MONTH: победитель периода (первый день месяца), предложение сервера
-- и подтверждение админа. Вехи (FIRST_MEETING, PARTICIPANTS_100, RETURNING_20): без периода, выдаются автоматически один раз.
CREATE TABLE organization_awards (
    id              UUID PRIMARY KEY,
    organization_id UUID        NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
    kind            VARCHAR(30) NOT NULL,
    period          DATE,
    score           INTEGER     NOT NULL,
    status          VARCHAR(20) NOT NULL,
    confirmed_at    TIMESTAMPTZ,
    confirmed_by_id UUID REFERENCES users (id),
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_organization_awards_period UNIQUE (period)
);
-- Каждая веха у организации одна.
CREATE UNIQUE INDEX uq_organization_awards_milestone ON organization_awards (organization_id, kind)
    WHERE kind <> 'ORG_OF_MONTH';
