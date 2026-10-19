package com.hackathon.app.domain.mapper;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.FocusPoint;
import com.hackathon.app.domain.entity.StoredFile;
import com.hackathon.app.domain.enums.FileKind;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

@Mapper(config = MappingConfig.class)
public interface FileMapper {

	@Mapping(target = "url", source = "id", qualifiedByName = "fileUrl")
	@Mapping(target = "name", source = "originalName")
	@Mapping(target = "size", source = "sizeBytes")
	@Mapping(target = "focus", expression = "java(focus(file))")
	FileResponse toResponse(StoredFile file);

	List<FileResponse> toResponses(List<StoredFile> files);

	StoredFile toEntity(FileKind kind, String objectKey, String contentType, long sizeBytes, String originalName,
			UUID uploadedById, UUID organizationId, UUID eventId, Integer position);

	/** Новая точка фокуса; null — центр. */
	default void focus(@MappingTarget StoredFile file, FocusPoint focus) {
		file.setFocusX(focus == null ? null : focus.x());
		file.setFocusY(focus == null ? null : focus.y());
	}

	/** Точка фокуса файла; null — не задана (центр). */
	default FocusPoint focus(StoredFile file) {
		return file.getFocusX() == null || file.getFocusY() == null ? null : new FocusPoint(file.getFocusX(), file.getFocusY());
	}

	/** Ссылка, по которой браузер получает файл; null — файла нет. */
	@Named("fileUrl")
	default String fileUrl(UUID fileId) {
		return fileId == null ? null : "/api/files/" + fileId;
	}
}
