-- Пример из шаблона (V1, таблица note) больше не нужен
DROP TABLE IF EXISTS note;

-- Справочник видов спорта: новый вид = новая строка, а не изменение кода. custom — добавлен пользователем.
CREATE TABLE sports (
    id              UUID PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    custom          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_by_id   UUID REFERENCES users (id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_sports_normalized_name UNIQUE (normalized_name),
    CONSTRAINT uq_sports_slug UNIQUE (slug)
);
INSERT INTO sports (id, name, normalized_name, slug) VALUES
    (gen_random_uuid(), 'Футбол', 'футбол', 'football'),
    (gen_random_uuid(), 'Баскетбол', 'баскетбол', 'basketball'),
    (gen_random_uuid(), 'Волейбол', 'волейбол', 'volleyball'),
    (gen_random_uuid(), 'Бег', 'бег', 'running'),
    (gen_random_uuid(), 'Велоспорт', 'велоспорт', 'cycling'),
    (gen_random_uuid(), 'Теннис', 'теннис', 'tennis'),
    (gen_random_uuid(), 'Настольный теннис', 'настольный теннис', 'table_tennis'),
    (gen_random_uuid(), 'Плавание', 'плавание', 'swimming'),
    (gen_random_uuid(), 'Йога', 'йога', 'yoga'),
    (gen_random_uuid(), 'Шахматы', 'шахматы', 'chess');

-- organization_id пока без внешнего ключа: таблица организаций появится отдельной миграцией.
CREATE TABLE events (
    id                UUID PRIMARY KEY,
    title             VARCHAR(200)  NOT NULL,
    description       VARCHAR(5000),
    sport_id          UUID          NOT NULL REFERENCES sports (id),
    author_id         UUID          NOT NULL REFERENCES users (id),
    organization_id   UUID,
    start_at          TIMESTAMPTZ   NOT NULL,
    end_at            TIMESTAMPTZ,
    format            VARCHAR(20)   NOT NULL,
    address           VARCHAR(500),
    location_note     VARCHAR(1000),
    online_url        VARCHAR(1000),
    lat               DOUBLE PRECISION,
    lon               DOUBLE PRECISION,
    level             VARCHAR(20)   NOT NULL,
    kind              VARCHAR(30),
    requirements      VARCHAR(2000),
    equipment         VARCHAR(2000),
    capacity          INTEGER,
    join_mode         VARCHAR(20)   NOT NULL,
    private_details   VARCHAR(2000),
    status            VARCHAR(20)   NOT NULL,
    moderation_reason VARCHAR(1000),
    moderated_at      TIMESTAMPTZ,
    moderated_by_id   UUID REFERENCES users (id),
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL
);
CREATE INDEX ix_events_start ON events (start_at);
CREATE INDEX ix_events_sport ON events (sport_id);
CREATE INDEX ix_events_author ON events (author_id);

CREATE TABLE registrations (
    id              UUID PRIMARY KEY,
    event_id        UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL,
    message         VARCHAR(1000),
    decision_reason VARCHAR(1000),
    decided_at      TIMESTAMPTZ,
    decided_by_id   UUID REFERENCES users (id),
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_registrations_event_user UNIQUE (event_id, user_id)
);
CREATE INDEX ix_registrations_user ON registrations (user_id);
