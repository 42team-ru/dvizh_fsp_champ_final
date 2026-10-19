-- Лист ожидания: когда человек встал в очередь на полное мероприятие (порядок продвижения). Статус WAITLISTED — varchar.
ALTER TABLE registrations ADD COLUMN queued_at TIMESTAMPTZ;
CREATE INDEX ix_registrations_waitlist ON registrations (event_id, queued_at) WHERE status = 'WAITLISTED';

-- Объявление организатора участникам: закреплено вверху карточки, уходит уведомлением.
ALTER TABLE events ADD COLUMN announcement VARCHAR(1000);
ALTER TABLE events ADD COLUMN announced_at TIMESTAMPTZ;
