package com.hackathon.app.domain.mapper;

import java.util.UUID;

import com.hackathon.app.domain.dto.AlbumEventResponse;
import com.hackathon.app.domain.dto.AlbumPhotoResponse;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.dto.UserShortResponse;
import com.hackathon.app.domain.entity.AlbumPhoto;
import com.hackathon.app.domain.entity.Event;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = MappingConfig.class, uses = FileMapper.class)
public interface AlbumMapper {

	AlbumPhoto toEntity(UUID userId, UUID eventId, UUID fileId, String caption);

	/** Сменить подпись; пустая строка становится null (MappingConfig). */
	void updateCaption(@MappingTarget AlbumPhoto photo, String caption);

	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "title", source = "event.title")
	@Mapping(target = "startAt", source = "event.startAt")
	AlbumEventResponse toEvent(Event event, SportResponse sport, long photosCount);

	@Mapping(target = "id", source = "photo.id")
	@Mapping(target = "url", source = "photo.fileId", qualifiedByName = "fileUrl")
	@Mapping(target = "caption", source = "photo.caption")
	@Mapping(target = "createdAt", source = "photo.createdAt")
	AlbumPhotoResponse toResponse(AlbumPhoto photo, UserShortResponse author, AlbumEventResponse event, boolean mine);
}
