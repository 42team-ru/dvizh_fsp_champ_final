-- Модерация справочника видов спорта: статус, причина, слияние дублей и своя картинка (PNG в таблице files).
ALTER TABLE sports ADD COLUMN catalog_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE sports ADD COLUMN decision_reason VARCHAR(1000);
ALTER TABLE sports ADD COLUMN merged_into_id UUID REFERENCES sports (id);
ALTER TABLE sports ADD COLUMN decided_at TIMESTAMPTZ;
ALTER TABLE sports ADD COLUMN decided_by_id UUID REFERENCES users (id) ON DELETE SET NULL;
ALTER TABLE sports ADD COLUMN image_file_id UUID REFERENCES files (id) ON DELETE SET NULL;
ALTER TABLE sports ADD COLUMN image_focus_x REAL;
ALTER TABLE sports ADD COLUMN image_focus_y REAL;
ALTER TABLE sports ADD CONSTRAINT ck_sports_image_focus CHECK (
    (image_focus_x IS NULL) = (image_focus_y IS NULL)
    AND (image_focus_x IS NULL OR (image_focus_x BETWEEN 0 AND 100 AND image_focus_y BETWEEN 0 AND 100)));
-- Уже созданные пользователями виды ждут решения админа; справочные остаются ACTIVE.
UPDATE sports SET catalog_status = 'PENDING' WHERE custom;
CREATE INDEX ix_sports_status ON sports (catalog_status);
