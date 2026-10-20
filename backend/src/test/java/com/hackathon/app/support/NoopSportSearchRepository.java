package com.hackathon.app.support;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.repository.SportSearchRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;

/** Заглушка для тестов на H2: там нет pg_trgm, поэтому нечёткий поиск ничего не находит. Настоящий — в тестах с тегом postgres. */
@Repository
@Profile("h2")
public class NoopSportSearchRepository implements SportSearchRepository {

	@Override
	public List<UUID> findSimilarIds(String normalizedQuery, int limit) {
		return List.of();
	}
}
