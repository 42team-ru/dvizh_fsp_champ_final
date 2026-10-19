package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.dto.CommentReplyResponse;
import com.hackathon.app.domain.dto.CommentResponse;
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

	/** Флаги и счётчик считает сервис (EventAccessPolicy). Удалённое — без текста. */
	@Mapping(target = "id", source = "comment.id")
	// источники явно: у replyTo тоже есть author, без этого MapStruct подставит автора цитаты
	@Mapping(target = "author", source = "author")
	@Mapping(target = "replyTo", source = "replyTo")
	@Mapping(target = "text", source = "comment", qualifiedByName = "visibleText")
	@Mapping(target = "createdAt", source = "comment.createdAt")
	@Mapping(target = "editedAt", source = "comment.editedAt")
	@Mapping(target = "deleted", expression = "java(comment.getDeletedAt() != null)")
	CommentResponse toResponse(Comment comment, AppUser author, boolean isOrganizer, boolean isMine, boolean canEdit,
			CommentReplyResponse replyTo, long repliesCount);

	@Mapping(target = "id", source = "comment.id")
	@Mapping(target = "text", source = "comment", qualifiedByName = "quote")
	@Mapping(target = "deleted", expression = "java(comment.getDeletedAt() != null)")
	CommentReplyResponse toReply(Comment comment, AppUser author);

	@Named("visibleText")
	default String visibleText(Comment comment) {
		return comment.getDeletedAt() == null ? comment.getText() : null;
	}

	/** Начало текста для цитаты: «Можно прийти без своих…». */
	@Named("quote")
	default String quote(Comment comment) {
		var text = visibleText(comment);
		if (text == null || text.length() <= QUOTE_LENGTH) {
			return text;
		}
		return text.substring(0, QUOTE_LENGTH).stripTrailing() + "…";
	}
}
