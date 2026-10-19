-- Внутренние уведомления, внешняя очередь и Telegram.
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    actor_id UUID,
    type VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    dedup_key VARCHAR(200) NOT NULL,
    title VARCHAR(500),
    body VARCHAR(4000),
    target_path VARCHAR(500),
    event_id UUID,
    occurrence_id UUID,
    organization_id UUID,
    expected_start_at TIMESTAMPTZ,
    revision BIGINT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE notification_inboxes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    revision BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY,
    notification_id UUID,
    user_id UUID,
    channel VARCHAR(255),
    status VARCHAR(255),
    binding_id UUID,
    chat_id BIGINT,
    text VARCHAR(4000),
    dedup_key VARCHAR(250) NOT NULL,
    attempts INTEGER NOT NULL,
    next_attempt_at TIMESTAMPTZ,
    lease_until TIMESTAMPTZ,
    lease_token UUID,
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_error VARCHAR(500),
    message_id BIGINT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE notification_reminders (
    id UUID PRIMARY KEY,
    event_id UUID,
    occurrence_id UUID,
    expected_start_at TIMESTAMPTZ,
    offset_minutes INTEGER NOT NULL,
    due_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    dedup_key VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE telegram_bindings (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    telegram_user_id BIGINT,
    chat_id BIGINT,
    username VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE telegram_link_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash VARCHAR(64),
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE telegram_update_receipts (
    id UUID PRIMARY KEY,
    update_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE telegram_rate_limits (
    id UUID PRIMARY KEY,
    scope VARCHAR(100) NOT NULL,
    available_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE notification_setting_channels (settings_id UUID NOT NULL REFERENCES notification_settings(id) ON DELETE CASCADE, channel VARCHAR(255) NOT NULL, PRIMARY KEY(settings_id, channel));
CREATE TABLE notification_setting_categories (settings_id UUID NOT NULL REFERENCES notification_settings(id) ON DELETE CASCADE, category VARCHAR(255) NOT NULL, PRIMARY KEY(settings_id, category));
CREATE UNIQUE INDEX uq_notifications_user_id_dedup_key ON notifications (user_id, dedup_key);
CREATE UNIQUE INDEX uq_notification_inboxes_user_id ON notification_inboxes (user_id);
CREATE UNIQUE INDEX uq_notification_settings_user_id ON notification_settings (user_id);
CREATE UNIQUE INDEX uq_notification_deliveries_dedup_key ON notification_deliveries (dedup_key);
CREATE UNIQUE INDEX uq_notification_reminders_dedup_key ON notification_reminders (dedup_key);
CREATE UNIQUE INDEX uq_telegram_bindings_user_id ON telegram_bindings (user_id);
CREATE UNIQUE INDEX uq_telegram_bindings_telegram_user_id ON telegram_bindings (telegram_user_id);
CREATE UNIQUE INDEX uq_telegram_bindings_chat_id ON telegram_bindings (chat_id);
CREATE UNIQUE INDEX uq_telegram_link_tokens_token_hash ON telegram_link_tokens (token_hash);
CREATE UNIQUE INDEX uq_telegram_update_receipts_update_id ON telegram_update_receipts (update_id);
CREATE UNIQUE INDEX uq_telegram_rate_limits_scope ON telegram_rate_limits (scope);
CREATE INDEX ix_notifications_inbox ON notifications (user_id, created_at DESC, id DESC);
CREATE INDEX ix_notifications_unread ON notifications (user_id, read_at);
CREATE INDEX ix_notification_deliveries_due ON notification_deliveries (status, next_attempt_at);
CREATE INDEX ix_notification_deliveries_notification ON notification_deliveries (notification_id);
CREATE INDEX ix_notification_reminders_due ON notification_reminders (finished_at, due_at);
CREATE INDEX ix_notification_reminders_occurrence ON notification_reminders (occurrence_id);
ALTER TABLE notifications ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE notification_inboxes ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE notification_settings ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE notification_deliveries ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE telegram_bindings ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE telegram_link_tokens ADD FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE notification_deliveries ADD FOREIGN KEY (notification_id) REFERENCES notifications(id);

-- Общий ограничитель существует до запуска любой реплики и до приёма webhook.
INSERT INTO telegram_rate_limits (id, scope, available_at, created_at, updated_at)
VALUES (gen_random_uuid(), 'bot', '1970-01-01T00:00:00Z', now(), now());
