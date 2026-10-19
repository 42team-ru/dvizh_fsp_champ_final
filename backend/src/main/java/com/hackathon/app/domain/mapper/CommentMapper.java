package com.hackathon.app.domain.mapper;

import java.util.UUID;

import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Comment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MappingConfig.class, uses = UserMapper.class)
public interface CommentMapper {

	Comment toEntity(UUID eventId, UUID authorId, String text);

	/** isOrganizer считает сервис: автор, соорганизатор или аккаунт организации мероприятия. */
	@Mapping(target = "id", source = "comment.id")
	@Mapping(target = "createdAt", source = "comment.createdAt")
	CommentResponse toResponse(Comment comment, AppUser author, boolean isOrganizer);
}
