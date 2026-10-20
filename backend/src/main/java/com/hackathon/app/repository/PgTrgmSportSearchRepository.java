package com.hackathon.app.repository;

import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Нечёткий поиск на pg_trgm: similarity сравнивает строки целиком, word_similarity — запрос с отдельным словом названия
 * («волейбол» в «пляжный волейбол»). Индекс ix_sports_name_trgm создан миграцией V39. Только Postgres.
 */
@Repository
@Profile("!h2")
@RequiredArgsConstructor
public class PgTrgmSportSearchRepository implements SportSearchRepository {

	private final JdbcClient jdbc;

	@Override
	public List<UUID> findSimilarIds(String normalizedQuery, int limit) {
		return jdbc.sql("""
						select id from sports
						where similarity(normalized_name, :q) > 0.3 or word_similarity(:q, normalized_name) > 0.5
						order by greatest(similarity(normalized_name, :q), word_similarity(:q, normalized_name)) desc
						limit :limit
						""")
				.param("q", normalizedQuery)
				.param("limit", limit)
				.query(UUID.class)
				.list();
	}
}
