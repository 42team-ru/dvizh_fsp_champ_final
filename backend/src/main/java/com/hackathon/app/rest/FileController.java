package com.hackathon.app.rest;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;

import com.hackathon.app.service.FileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Раздача файлов из S3 через бэкенд: хранилище наружу не открыто, права проверяет FileService.
 * Исключение из правила produces = JSON: ответ — сами байты файла (ошибки по-прежнему ProblemDetail).
 */
@Slf4j
@Tag(name = "files", description = "Загруженные файлы: аватарки, логотипы, документы, фото мероприятий")
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
class FileController {

	/** Ссылка на файл не меняется (новый файл — новый id), поэтому браузер может держать его в кэше. */
	private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofDays(1)).cachePrivate();

	private final FileService files;

	@GetMapping(path = "/{id}", produces = MediaType.ALL_VALUE)
	@Operation(operationId = "files_get", summary = "Скачать или показать файл",
			description = "Картинки отдаются для показа (img src), документы — на скачивание. Чужие документы неодобренной организации — 404.")
	@ApiResponse(responseCode = "200", description = "Содержимое файла",
			content = @Content(mediaType = MediaType.APPLICATION_OCTET_STREAM_VALUE, schema = @Schema(type = "string", format = "binary")))
	@ApiResponse(responseCode = "404", description = "Файла нет или нет доступа", content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE, schema = @Schema(implementation = ProblemDetail.class)))
	ResponseEntity<InputStreamResource> get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: GET /api/files/{}, userId={}", id, jwt.getSubject());
		var file = files.download(id, UUID.fromString(jwt.getSubject()));
		var disposition = (file.attachment() ? ContentDisposition.attachment() : ContentDisposition.inline())
				.filename(file.name(), StandardCharsets.UTF_8).build();
		log.info("Endpoint response: GET /api/files/{}, contentType={}, size={}", id, file.contentType(), file.size());
		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(file.contentType()))
				.contentLength(file.size())
				.cacheControl(CACHE)
				.header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
				.header("X-Content-Type-Options", "nosniff")
				.body(new InputStreamResource(file.content()));
	}
}
