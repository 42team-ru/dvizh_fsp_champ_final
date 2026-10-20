package com.hackathon.app.repository;

import java.util.List;
import java.util.UUID;

/**
 * Нечёткий поиск видов спорта по названию. На Postgres работает через pg_trgm (PgTrgmSportSearchRepository);
 * в тестах на H2 расширения нет, там подставляется заглушка без результатов.
 */
public interface SportSearchRepository {

	/** id видов, похожих на нормализованный запрос с опечаткой; самые похожие первыми. */
	List<UUID> findSimilarIds(String normalizedQuery, int limit);
}
