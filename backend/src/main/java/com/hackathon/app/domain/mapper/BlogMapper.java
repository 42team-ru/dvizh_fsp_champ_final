package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.BlogAuthorResponse;
import com.hackathon.app.domain.dto.BlogCommentReplyResponse;
import com.hackathon.app.domain.dto.BlogCommentResponse;
import com.hackathon.app.domain.dto.BlogEventResponse;
import com.hackathon.app.domain.dto.BlogLikeResponse;
import com.hackathon.app.domain.dto.BlogPhotoResponse;
import com.hackathon.app.domain.dto.BlogPostResponse;
import com.hackathon.app.domain.dto.BlogPostSummaryResponse;
import com.hackathon.app.domain.dto.BlogPromptResponse;
import com.hackathon.app.domain.dto.BlogViewerResponse;
import com.hackathon.app.domain.dto.BlogWidgetResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.OrganizationShortResponse;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.dto.UserShortResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.BlogComment;
import com.hackathon.app.domain.entity.BlogPost;
import com.hackathon.app.domain.entity.BlogPostLike;
import com.hackathon.app.domain.entity.BlogPostPhoto;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.StoredFile;
import com.hackathon.app.domain.enums.BlogPostStatus;
import com.hackathon.app.domain.enums.BlogPostType;
import com.hackathon.app.util.Markdown;
import com.hackathon.app.util.Strings;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

/**
 * Блог: сущности поста, фото, лайка и комментария и ответы API. У ответов много источников с одинаковыми полями
 * (id, title есть и у поста, и у встречи), поэтому они собираются явными default-методами.
 */
@Mapper(config = MappingConfig.class)
public interface BlogMapper {

	/** Длина превью в карточке. */
	int EXCERPT_LENGTH = 200;
	/** Длина цитаты над ответом. */
	int QUOTE_LENGTH = 140;

	UserShortResponse toShort(AppUser user);

	BlogPost toEntity(UUID authorId, BlogPostType type, BlogPostStatus status, UUID eventId, UUID sportId,
			String title, String body, UUID widgetOrganizationId, UUID widgetUserId, boolean commentsEnabled,
			Instant publishedAt);

	/**
	 * Правка заменяет все поля; null у встречи, вида и виджета — убрать (сгенерированный метод null пропустил бы).
	 * publishedAt — дата первой публикации: при снятии в черновик не стирается.
	 */
	default void update(@MappingTarget BlogPost post, BlogPostType type, BlogPostStatus status, UUID eventId,
			UUID sportId, String title, String body, UUID widgetOrganizationId, UUID widgetUserId,
			boolean commentsEnabled, Instant publishedAt) {
		post.setType(type);
		post.setStatus(status);
		post.setEventId(eventId);
		post.setSportId(sportId);
		post.setTitle(Strings.blankToNull(title));
		post.setBody(Strings.blankToNull(body));
		post.setWidgetOrganizationId(widgetOrganizationId);
		post.setWidgetUserId(widgetUserId);
		post.setCommentsEnabled(commentsEnabled);
		if (post.getPublishedAt() == null) {
			post.setPublishedAt(publishedAt);
		}
	}

	BlogPostPhoto toPhoto(UUID postId, UUID fileId, int position, String caption);

	BlogPostLike toLike(UUID postId, UUID userId);

	BlogComment toComment(UUID postId, UUID authorId, String text, UUID parentId);

	/** Автор исправил текст. */
	void edit(@MappingTarget BlogComment comment, String text, Instant editedAt);

	/** Автор удалил: текст больше не отдаётся, ответы на комментарий остаются. */
	void delete(@MappingTarget BlogComment comment, Instant deletedAt);

	default BlogPhotoResponse toPhotoResponse(StoredFile file, String caption) {
		return new BlogPhotoResponse(file.getId(), "/api/files/" + file.getId(), caption,
				file.getFocusX() == null || file.getFocusY() == null ? null
						: new com.hackathon.app.domain.dto.FocusPoint(file.getFocusX(), file.getFocusY()));
	}

	default BlogEventResponse toEvent(Event event, SportResponse sport, AppUser organizer,
			OrganizationShortResponse organization, String coverUrl) {
		return new BlogEventResponse(event.getId(), event.getTitle(), event.getStartAt(), event.getStatus(), sport,
				toShort(organizer), organization, coverUrl);
	}

	/** Счётчики и флаги посчитал сервис по одному запросу на страницу. */
	default BlogPostSummaryResponse toSummary(BlogPost post, BlogPhotoResponse cover, int photosCount,
			SportResponse sport, BlogEventResponse event, AppUser author, OrganizationShortResponse organization,
			boolean authorWasThere, long likesCount, boolean likedByMe, long commentsCount) {
		return new BlogPostSummaryResponse(post.getId(), post.getType(), post.getStatus(), post.getTitle(),
				Markdown.excerpt(post.getBody(), EXCERPT_LENGTH), Markdown.readMinutes(post.getBody()), cover,
				photosCount, sport, event, toShort(author), organization, authorWasThere, likesCount, likedByMe,
				commentsCount, post.getPublishedAt(), post.getCreatedAt(), post.getUpdatedAt());
	}

	default BlogPostResponse toResponse(BlogPostSummaryResponse summary, BlogPost post, List<BlogPhotoResponse> photos,
			BlogWidgetResponse widget, BlogViewerResponse viewer) {
		return new BlogPostResponse(summary, post.getBody(), photos, widget, post.getWidgetOrganizationId(),
				post.getWidgetUserId(), post.isCommentsEnabled(), viewer);
	}

	default BlogWidgetResponse toWidget(OrganizationShortResponse organization, AppUser organizer,
			List<EventSummaryResponse> events) {
		return new BlogWidgetResponse(organization, organizer == null ? null : toShort(organizer), events);
	}

	default BlogViewerResponse toViewer(boolean isMine, boolean canEdit, boolean canDelete, boolean canLike,
			String commentBlockedReason) {
		return new BlogViewerResponse(isMine, canEdit, canDelete, canLike, commentBlockedReason == null,
				commentBlockedReason);
	}

	default BlogLikeResponse toLikeResponse(long likesCount, boolean likedByMe) {
		return new BlogLikeResponse(likesCount, likedByMe);
	}

	default BlogPromptResponse toPrompt(BlogEventResponse event, Instant endedAt, List<FileResponse> photos,
			long photosCount) {
		return new BlogPromptResponse(event, endedAt, photos, photosCount);
	}

	default BlogAuthorResponse toAuthor(AppUser author, OrganizationShortResponse organization, long postsCount) {
		return new BlogAuthorResponse(toShort(author), organization, postsCount);
	}

	/** Удалённое — без текста; метку «Автор» и права посчитал сервис. */
	default BlogCommentResponse toCommentResponse(BlogComment comment, AppUser author,
			OrganizationShortResponse organization, boolean isPostAuthor, boolean isMine, boolean canEdit,
			BlogCommentReplyResponse replyTo) {
		boolean deleted = comment.getDeletedAt() != null;
		return new BlogCommentResponse(comment.getId(), toShort(author), organization, isPostAuthor,
				deleted ? null : comment.getText(), comment.getCreatedAt(), comment.getEditedAt(), deleted, replyTo,
				isMine, canEdit);
	}

	/** Цитата над ответом: начало текста; удалённое не цитируется. */
	default BlogCommentReplyResponse toReply(BlogComment comment, AppUser author) {
		boolean deleted = comment.getDeletedAt() != null;
		var text = deleted ? null : comment.getText();
		if (text != null && text.length() > QUOTE_LENGTH) {
			text = text.substring(0, QUOTE_LENGTH).stripTrailing() + "…";
		}
		return new BlogCommentReplyResponse(comment.getId(), toShort(author), text, deleted);
	}
}
