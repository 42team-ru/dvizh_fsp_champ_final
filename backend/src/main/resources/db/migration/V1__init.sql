-- Пример. Меняйте/удаляйте под проект.
CREATE TABLE note (
    id         BIGSERIAL PRIMARY KEY,
    text       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
