package com.hackathon.app.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.StoredFile;
import com.hackathon.app.domain.enums.FileKind;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {

	List<StoredFile> findByUploadedByIdAndKind(UUID uploadedById, FileKind kind);

	List<StoredFile> findByOrganizationIdAndKindOrderByCreatedAtAsc(UUID organizationId, FileKind kind);

	long countByOrganizationIdAndKind(UUID organizationId, FileKind kind);

	/** Галерея мероприятия по порядку. */
	List<StoredFile> findByEventIdAndKindOrderByPositionAscCreatedAtAsc(UUID eventId, FileKind kind);

	/** Фото сразу для списка мероприятий: обложка ленты — первое по порядку. */
	List<StoredFile> findByEventIdInAndKindOrderByPositionAscCreatedAtAsc(Collection<UUID> eventIds, FileKind kind);

	long countByEventIdAndKind(UUID eventId, FileKind kind);

	@Query("select coalesce(max(f.position), 0) from StoredFile f where f.eventId = :eventId and f.kind = :kind")
	int maxPosition(UUID eventId, FileKind kind);
}
