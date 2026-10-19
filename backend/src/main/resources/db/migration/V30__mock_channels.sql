ALTER TABLE notification_settings ADD COLUMN email varchar(254);
ALTER TABLE notification_settings ADD COLUMN max_phone varchar(32);

-- Старые демонстрационные подписки без адресата требуют явного подключения.
DELETE FROM notification_setting_channels WHERE channel IN ('EMAIL', 'MAX');
