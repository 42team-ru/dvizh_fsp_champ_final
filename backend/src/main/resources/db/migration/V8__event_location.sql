-- Карта событий: PostGIS-точка рядом с lat/lon. Источник правды — lat/lon (их пишет Hibernate),
-- location база вычисляет сама; по ней GiST-индекс для поиска по видимой области карты.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Онлайн-событиям точка не нужна; очным без точки ставим центр Красноярска, чтобы включить проверку ниже.
UPDATE events SET lat = NULL, lon = NULL WHERE format = 'ONLINE';
UPDATE events SET lat = 56.0106, lon = 92.8526
    WHERE format = 'OFFLINE' AND (lat IS NULL OR lon IS NULL);

ALTER TABLE events ADD CONSTRAINT ck_events_coords_pair CHECK ((lat IS NULL) = (lon IS NULL));
ALTER TABLE events ADD CONSTRAINT ck_events_offline_point CHECK (format <> 'OFFLINE' OR lat IS NOT NULL);

ALTER TABLE events ADD COLUMN location geometry(Point, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lon, lat), 4326)) STORED;
CREATE INDEX ix_events_location ON events USING gist (location);
