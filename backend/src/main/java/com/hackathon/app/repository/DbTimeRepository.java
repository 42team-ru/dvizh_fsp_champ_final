package com.hackathon.app.repository;

import java.time.Instant;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/** Текущее время берётся у базы (select current_timestamp), а не у JVM: одни часы на все инстансы. */
@Repository
@RequiredArgsConstructor
public class DbTimeRepository {

	private final EntityManager em;

	public Instant now() {
		return em.createQuery("select current_instant", Instant.class).getSingleResult();
	}
}
