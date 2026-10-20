-- Нечёткий поиск видов спорта с опечатками («падэл» → «Падел»), см. SportService.search.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ix_sports_name_trgm ON sports USING gin (normalized_name gin_trgm_ops);
