package com.hackathon.app.demo;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/** Кто есть в демо: логин → id основных аккаунтов и дата регистрации каждого аккаунта (людей и клубов). */
final class DemoCast {

	private final Map<String, UUID> ids = new HashMap<>();
	private final Map<UUID, Instant> since = new HashMap<>();

	void add(String username, UUID id, Instant signedUpAt) {
		ids.put(username, id);
		since.put(id, signedUpAt);
	}

	/** Id основного аккаунта по логину. */
	UUID id(String username) {
		return ids.get(username);
	}

	/** Когда аккаунт зарегистрировался. */
	Instant since(UUID id) {
		return since.get(id);
	}

	/** Массовка регистрируется отдельно и в логины не попадает. */
	void remember(UUID id, Instant signedUpAt) {
		since.put(id, signedUpAt);
	}
}
