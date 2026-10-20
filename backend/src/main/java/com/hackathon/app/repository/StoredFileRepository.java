package com.hackathon.app.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.StoredFile;
import com.hackathon.app.domain.enums.FileKind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface StoredFileRepository extends JpaRepository<StoredFile, UUID> {

	List<StoredFile> findByUploadedByIdAndKind(UUID uploadedById, FileKind kind);

    /** Личная галерея в порядке загрузки. */
    List<StoredFile> findByUploadedByIdAndKindOrderByCreatedAtAscIdAsc(UUID uploadedById, FileKind kind);

    long countByUploadedByIdAndKind(UUID uploadedById, FileKind kind);

	List<StoredFile> findByOrganizationIdAndKindOrderByCreatedAtAsc(UUID organizationId, FileKind kind);

	long countByOrganizationIdAndKind(UUID organizationId, FileKind kind);

	/** Галерея мероприятия по порядку. */
	List<StoredFile> findByEventIdAndKindOrderByPositionAscCreatedAtAsc(UUID eventId, FileKind kind);

	/** Фото сразу для списка мероприятий: обложка ленты — первое по порядку. */
	List<StoredFile> findByEventIdInAndKindOrderByPositionAscCreatedAtAsc(Collection<UUID> eventIds, FileKind kind);

	long countByEventIdAndKind(UUID eventId, FileKind kind);

	@Query("select coalesce(max(f.position), 0) from StoredFile f where f.eventId = :eventId and f.kind = :kind")
	int maxPosition(UUID eventId, FileKind kind);

	/** Альбом человека: фото с занятий, по желанию одного занятия или вида спорта; порядок задаёт Pageable. */
	@Query(value = """
			select f from StoredFile f join Event e on e.id = f.eventId
			where f.uploadedById = :userId and f.kind = com.hackathon.app.domain.enums.FileKind.ALBUM_PHOTO
			  and f.eventId = coalesce(:eventId, f.eventId)
			  and e.sportId = coalesce(:sportId, e.sportId)""",
			countQuery = """
			select count(f) from StoredFile f join Event e on e.id = f.eventId
			where f.uploadedById = :userId and f.kind = com.hackathon.app.domain.enums.FileKind.ALBUM_PHOTO
			  and f.eventId = coalesce(:eventId, f.eventId)
			  and e.sportId = coalesce(:sportId, e.sportId)""")
	Page<StoredFile> findAlbum(UUID userId, UUID eventId, UUID sportId, Pageable pageable);

	/** Все фото альбома, свежие первыми: из них собираются папки. */
	List<StoredFile> findByUploadedByIdAndKindOrderByCreatedAtDescIdDesc(UUID uploadedById, FileKind kind);

    interface PhotoCount {
        UUID getEventId();
        long getCount();
    }
    @Query("""
        select f.eventId as eventId, count(f) as count from StoredFile f join Event e on e.id = f.eventId
        where e.organizationId = :organizationId and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
        and f.kind in (com.hackathon.app.domain.enums.FileKind.EVENT_PHOTO, com.hackathon.app.domain.enums.FileKind.ALBUM_PHOTO)
        group by f.eventId
        """)
    List<PhotoCount> organizationPhotoCounts(UUID organizationId);

    @Query("""
        select f from StoredFile f join Event e on e.id = f.eventId
        where e.organizationId = :organizationId and e.status = com.hackathon.app.domain.enums.EventStatus.PUBLISHED
        and f.kind in (com.hackathon.app.domain.enums.FileKind.EVENT_PHOTO, com.hackathon.app.domain.enums.FileKind.ALBUM_PHOTO)
        order by f.createdAt desc, f.id
        """)
    Page<StoredFile> organizationPhotos(UUID organizationId, Pageable pageable);


    @Query("""
        select f.eventId as eventId, count(f) as count from StoredFile f where f.eventId in :eventIds
        and f.kind in (com.hackathon.app.domain.enums.FileKind.EVENT_PHOTO, com.hackathon.app.domain.enums.FileKind.ALBUM_PHOTO)
        group by f.eventId
        """)
    List<PhotoCount> photoCounts(Collection<UUID> eventIds);


	/** Фото встречи для поста: альбомы участников и фото мероприятия, по времени загрузки. */
	List<StoredFile> findByEventIdAndKindInOrderByCreatedAtAscIdAsc(UUID eventId, java.util.Collection<FileKind> kinds);
}
