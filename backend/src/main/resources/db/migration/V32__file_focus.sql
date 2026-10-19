-- Точка фокуса фото (проценты от ширины и высоты): по ней превью обрезаются через object-position.
ALTER TABLE files ADD COLUMN focus_x REAL;
ALTER TABLE files ADD COLUMN focus_y REAL;
ALTER TABLE files ADD CONSTRAINT ck_files_focus CHECK (
    (focus_x IS NULL) = (focus_y IS NULL)
    AND (focus_x IS NULL OR (focus_x BETWEEN 0 AND 100 AND focus_y BETWEEN 0 AND 100)));
