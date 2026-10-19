-- Бобр-маскот. Каталог — данные, а не код: админ добавляет слоты одежды и отдельные вещи с картинкой в S3.
-- Встроенные слоты и вещи рисует фронт (beaver-wardrobe.ts), картинки у них нет. Их создаёт бэкенд при старте
-- (PetCatalogService, идемпотентно по ключу) — так каталог есть и в тестах на H2, где миграции не запускаются.

-- Слоты: настроение, инвентарь и части одежды (на голове, очки, на шее...). В каждом слоте надет максимум один предмет.
CREATE TABLE pet_slots (
    id         UUID PRIMARY KEY,
    code       VARCHAR(40)  NOT NULL UNIQUE,
    label      VARCHAR(100) NOT NULL,
    kind       VARCHAR(20)  NOT NULL,
    position   INTEGER      NOT NULL,
    built_in   BOOLEAN      NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL
);

-- Вещи слота: встроенные (рисует фронт) и добавленные админом (картинка в S3).
CREATE TABLE pet_items (
    id            UUID PRIMARY KEY,
    slot_id       UUID         NOT NULL REFERENCES pet_slots (id) ON DELETE CASCADE,
    code          VARCHAR(60)  NOT NULL,
    label         VARCHAR(200) NOT NULL,
    image_file_id UUID REFERENCES files (id) ON DELETE SET NULL,
    built_in      BOOLEAN      NOT NULL,
    position      INTEGER      NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_pet_items_slot_code UNIQUE (slot_id, code)
);

-- Что надето на бобре пользователя: одна вещь на слот. Нет строки — слот пуст (настроение idle, инвентарь none).
CREATE TABLE user_pet_equipment (
    id         UUID PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    slot_id    UUID        NOT NULL REFERENCES pet_slots (id) ON DELETE CASCADE,
    item_id    UUID        NOT NULL REFERENCES pet_items (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_user_pet_equipment_user_slot UNIQUE (user_id, slot_id)
);
