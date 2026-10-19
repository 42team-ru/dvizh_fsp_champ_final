package com.hackathon.app.domain.mapper;

import java.util.UUID;

import com.hackathon.app.domain.dto.AlbumEventResponse;
import com.hackathon.app.domain.dto.AlbumFolderResponse;
import com.hackathon.app.domain.dto.AlbumPhotoResponse;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.StoredFile;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = MappingConfig.class, uses = FileMapper.class)
public interface AlbumMapper {

	@Mapping(target = "id", source = "event.id")
	@Mapping(target = "title", source = "event.title")
	@Mapping(target = "startAt", source = "event.startAt")
	@Mapping(target = "status", source = "event.status")
	AlbumEventResponse toEvent(Event event, SportResponse sport);

	@Mapping(target = "id", source = "file.id")
	@Mapping(target = "url", source = "file.id", qualifiedByName = "fileUrl")
	@Mapping(target = "caption", source = "file.caption")
	@Mapping(target = "createdAt", source = "file.createdAt")
	AlbumPhotoResponse toPhoto(StoredFile file, AlbumEventResponse event, boolean mine);

	@Mapping(target = "coverUrl", source = "coverId", qualifiedByName = "fileUrl")
	AlbumFolderResponse toFolder(AlbumEventResponse event, long photoCount, UUID coverId);

	void caption(@MappingTarget StoredFile file, String caption);
}
