package com.hackathon.app.domain.mapper;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.entity.StoredFile;
import com.hackathon.app.domain.enums.FileKind;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(config = MappingConfig.class)
public interface FileMapper {

	@Mapping(target = "url", source = "id", qualifiedByName = "fileUrl")
	@Mapping(target = "name", source = "originalName")
	@Mapping(target = "size", source = "sizeBytes")
	FileResponse toResponse(StoredFile file);

	List<FileResponse> toResponses(List<StoredFile> files);

	StoredFile toEntity(FileKind kind, String objectKey, String contentType, long sizeBytes, String originalName,
			UUID uploadedById, UUID organizationId, UUID eventId, Integer position);

	/** Ссылка, по которой браузер получает файл; null — файла нет. */
	@Named("fileUrl")
	default String fileUrl(UUID fileId) {
		return fileId == null ? null : "/api/files/" + fileId;
	}
}
