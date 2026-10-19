-- Файлы в S3: аватарки, логотипы и документы организаций, фото мероприятий. Байты в бакете, здесь метаданные.
CREATE TABLE files (
    id              UUID PRIMARY KEY,
    kind            VARCHAR(20)  NOT NULL,
    object_key      VARCHAR(200) NOT NULL UNIQUE,
    content_type    VARCHAR(100) NOT NULL,
    size_bytes      BIGINT       NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    uploaded_by_id  UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations (id) ON DELETE CASCADE,
    event_id        UUID REFERENCES events (id) ON DELETE CASCADE,
    position        INTEGER,
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL
);
CREATE INDEX ix_files_event ON files (event_id, position);
CREATE INDEX ix_files_organization ON files (organization_id, kind);
CREATE INDEX ix_files_uploaded_by ON files (uploaded_by_id, kind);

-- Логотип организации. Аватар пользователя — уже есть users.avatar_url (ссылка /api/files/{id}).
ALTER TABLE organizations ADD COLUMN logo_file_id UUID REFERENCES files (id) ON DELETE SET NULL;
