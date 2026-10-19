package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.dto.CommentReplyResponse;
import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.domain.dto.OrganizationShortResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Comment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

@Mapper(config = MappingConfig.class, uses = UserMapper.class)
public interface CommentMapper {

	/** Длина цитаты над ответом. */
	int QUOTE_LENGTH = 140;

	/** parentId — на какое сообщение ответ; null — в общий поток. */
	Comment toEntity(UUID eventId, UUID authorId, String text, UUID parentId);

	/** Автор исправил текст. */
	void edit(@MappingTarget Comment comment, String text, Instant editedAt);

	/** Автор удалил: текст в ответах больше не отдаётся, ответы на сообщение остаются. */
	void delete(@MappingTarget Comment comment, Instant deletedAt);

	/**
	 * Решение модератора: скрыть (время, админ и причина) или вернуть (hidden = false, остальное null).
	 * Повторное скрытие обновляет причину.
	 */
	default void moderate(@MappingTarget Comment comment, boolean hidden, Instant hiddenAt, UUID hiddenById,
			String hideReason) {
		// вручную: сгенерированный метод пропустил бы null и не снял бы скрытие
		comment.setHidden(hidden);
		comment.setHiddenAt(hiddenAt);
		comment.setHiddenById(hiddenById);
		comment.setHideReason(hideReason);
	}

	/**
	 * Флаги и счётчик считает сервис (EventAccessPolicy). Удалённое — без текста; скрытое — без текста для всех,
	 * кроме seeHidden (админ видит текст и причину, автор — только причину).
	 */
	@Mapping(target = "id", source = "comment.id")
	// источники явно: у replyTo тоже есть author, без этого MapStruct подставит автора цитаты
	@Mapping(target = "author", source = "author")
	@Mapping(target = "organization", source = "organization")
	@Mapping(target = "replyTo", source = "replyTo")
	@Mapping(target = "text", expression = "java(seeHidden ? visibleText(comment) : publicText(comment))")
	@Mapping(target = "createdAt", source = "comment.createdAt")
	@Mapping(target = "editedAt", source = "comment.editedAt")
	@Mapping(target = "deleted", expression = "java(comment.getDeletedAt() != null)")
	@Mapping(target = "hidden", source = "comment.hidden")
	@Mapping(target = "hiddenReason", expression = "java(seeReason ? comment.getHideReason() : null)")
	CommentResponse toResponse(Comment comment, AppUser author, OrganizationShortResponse organization,
			boolean isOrganizer, boolean isMine, boolean canEdit, CommentReplyResponse replyTo, long repliesCount,
			boolean seeHidden, boolean seeReason);

	@Mapping(target = "id", source = "comment.id")
	@Mapping(target = "text", source = "comment", qualifiedByName = "quote")
	@Mapping(target = "deleted", expression = "java(comment.getDeletedAt() != null)")
	@Mapping(target = "hidden", source = "comment.hidden")
	CommentReplyResponse toReply(Comment comment, AppUser author);

	/** Текст без учёта скрытия: удалённое автором — null. */
	default String visibleText(Comment comment) {
		return comment.getDeletedAt() == null ? comment.getText() : null;
	}

	/** Текст для всех: удалённое и скрытое модератором — null. */
	default String publicText(Comment comment) {
		return comment.isHidden() ? null : visibleText(comment);
	}

	/** Начало текста для цитаты: «Можно прийти без своих…». Скрытое не цитируется никому. */
	@Named("quote")
	default String quote(Comment comment) {
		var text = publicText(comment);
		if (text == null || text.length() <= QUOTE_LENGTH) {
			return text;
		}
		return text.substring(0, QUOTE_LENGTH).stripTrailing() + "…";
	}
}
