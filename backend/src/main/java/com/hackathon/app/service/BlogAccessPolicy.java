package com.hackathon.app.service;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.BlogComment;
import com.hackathon.app.domain.entity.BlogPost;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.BlogPostStatus;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Все правила блога «можно ли»: писать, писать о встрече, видеть, править, комментировать. Ими пользуются
 * и команды BlogService (бросают исключение с этим же текстом), и блок viewer в ответе — фронт правила не дублирует.
 * Методы *BlockedReason возвращают текст для человека или null, если можно.
 */
@Component
@RequiredArgsConstructor
public class BlogAccessPolicy {

	private final EventAccessPolicy eventPolicy;

	/** Пишут люди и одобренные клубы; админ в блог не пишет (как и событий не создаёт). 403. */
	public String writeBlockedReason(AppUser user, Organization organization) {
		return switch (user.getSystemRole()) {
			case ADMIN -> "Администратор не пишет в блог";
			case ORG -> organization == null || organization.getStatus() != OrganizationStatus.APPROVED
					? "Писать от имени организации можно после одобрения заявки"
					: null;
			case USER -> null;
		};
	}

	/** Был на встрече: организатор или подтверждённый участник — плашка «был на встрече» и право писать о ней. */
	public boolean wasThere(Event event, UUID userId, Registration registration) {
		return eventPolicy.isOrganizer(event, userId)
				|| registration != null && registration.getStatus() == RegistrationStatus.CONFIRMED;
	}

	/** О встрече пишет только тот, кто на ней был. 403. */
	public String reportForbiddenReason(Event event, UUID userId, Registration registration) {
		return wasThere(event, userId, registration) ? null
				: "Пост с тренировки пишут участники и организаторы этой встречи";
	}

	/** О встрече пишут после её начала и пока она не удалена. 409. */
	public String reportConflictReason(Event event, Instant now) {
		if (event.getStatus() == EventStatus.DELETED) {
			return "Встреча удалена — написать о ней нельзя";
		}
		if (event.getStartAt().isAfter(now)) {
			return "Встреча ещё не прошла — пост с тренировки можно написать после неё";
		}
		return null;
	}

	/** Опубликованное видят все вошедшие, черновик — только автор; остальным поста «нет» (404). */
	public boolean canView(BlogPost post, UUID userId) {
		return post.getStatus() == BlogPostStatus.PUBLISHED || post.getAuthorId().equals(userId);
	}

	public boolean canEdit(BlogPost post, UUID userId) {
		return post.getAuthorId().equals(userId);
	}

	/** Удаляет автор или админ (модерация). */
	public boolean canDelete(BlogPost post, AppUser viewer) {
		return canEdit(post, viewer.getId()) || viewer.getSystemRole() == SystemRole.ADMIN;
	}

	/** Лайкают опубликованное; админ не лайкает. */
	public String likeBlockedReason(BlogPost post, AppUser viewer) {
		if (post.getStatus() != BlogPostStatus.PUBLISHED) {
			return "Пост ещё не опубликован";
		}
		return viewer.getSystemRole() == SystemRole.ADMIN ? "Администратор не ставит лайки" : null;
	}

	/** Комментировать можно опубликованный пост с открытыми комментариями. 409. */
	public String commentBlockedReason(BlogPost post) {
		if (post.getStatus() != BlogPostStatus.PUBLISHED) {
			return "Пост ещё не опубликован — комментарии откроются после публикации";
		}
		return post.isCommentsEnabled() ? null : "Автор закрыл комментарии";
	}

	/** Ответить на удалённое нельзя. */
	public String replyBlockedReason(BlogPost post, BlogComment parent) {
		return parent.getDeletedAt() != null ? "Комментарий удалён — ответить на него нельзя" : commentBlockedReason(post);
	}

	/** Исправить или удалить можно только своё и не удалённое. */
	public String commentEditBlockedReason(BlogComment comment, UUID userId) {
		if (!comment.getAuthorId().equals(userId)) {
			return "Можно менять только свои комментарии";
		}
		return comment.getDeletedAt() != null ? "Комментарий уже удалён" : null;
	}
}
