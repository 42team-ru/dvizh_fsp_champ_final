-- Обсуждение как чат: ответ на конкретное сообщение, правка и удаление своего.
-- parent_id — на что отвечают (ответ остаётся, даже если исходное удалили: удаление мягкое).
ALTER TABLE comments ADD COLUMN parent_id UUID REFERENCES comments (id) ON DELETE SET NULL;
ALTER TABLE comments ADD COLUMN edited_at TIMESTAMPTZ;
ALTER TABLE comments ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX ix_comments_parent ON comments (parent_id);
