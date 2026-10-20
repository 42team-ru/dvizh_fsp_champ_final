package com.hackathon.app.repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.entity.BlogPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface BlogPostRepository extends JpaRepository<BlogPost, UUID>, JpaSpecificationExecutor<BlogPost> {

	/** Сколько постов у автора: проекция для группировки одним запросом. */
	interface AuthorCount {

		UUID getAuthorId();

		long getCount();
	}

	/** О каких встречах из списка автор уже писал (в любом статусе) — им «Как прошло?» больше не предлагаем. */
	@Query("select distinct p.eventId from BlogPost p where p.authorId = :authorId and p.eventId in :eventIds")
	List<UUID> findWrittenEventIds(UUID authorId, Collection<UUID> eventIds);

	/** Самые пишущие авторы с момента from: опубликованные посты, больше — выше. */
	@Query("""
			select p.authorId as authorId, count(p) as count from BlogPost p
			where p.status = com.hackathon.app.domain.enums.BlogPostStatus.PUBLISHED and p.publishedAt >= :from
			group by p.authorId
			order by count(p) desc, p.authorId""")
	List<AuthorCount> findTopAuthors(Instant from, Pageable limit);

	/** Опубликованные посты авторов из списка. */
	@Query("""
			select p.authorId as authorId, count(p) as count from BlogPost p
			where p.status = com.hackathon.app.domain.enums.BlogPostStatus.PUBLISHED and p.authorId in :authorIds
			group by p.authorId""")
	List<AuthorCount> countPublished(Collection<UUID> authorIds);
}
