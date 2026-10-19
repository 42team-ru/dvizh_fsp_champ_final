package com.hackathon.app.rest;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.service.SportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "sports", description = "Справочник видов спорта")
@RestController
@RequestMapping(path = "/api/sports", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class SportController {

	private final SportService sports;

	@GetMapping
	@Operation(operationId = "sports_search", summary = "Виды спорта",
			description = "Без query — весь справочник по алфавиту; с query — поиск по подстроке без учёта регистра, пробелов и ё/е.")
	List<SportResponse> search(@Parameter(description = "Часть названия", example = "фут")
			@RequestParam(required = false) String query) {
		log.info("Endpoint called: GET /api/sports, query={}", query);
		var response = sports.search(query);
		log.info("Endpoint response: GET /api/sports, count={}", response.size());
		return response;
	}

	/** Картинка, а не JSON: отдаётся прямо в {@code <img src>}, поэтому produces переопределён. */
	@GetMapping(path = "/{id}/image", produces = "image/webp")
	@Operation(operationId = "sports_image", summary = "Иллюстрация вида спорта",
			description = "WebP-картинка для карточек. Для своих видов без иллюстрации — общая картинка. Доступна без входа, кешируется на неделю.")
	ResponseEntity<Resource> image(@PathVariable UUID id) {
		log.info("Endpoint called: GET /api/sports/{}/image", id);
		var image = sports.image(id);
		log.info("Endpoint response: GET /api/sports/{}/image, file={}", id, image.getFilename());
		return ResponseEntity.ok()
				.cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic())
				.contentType(MediaType.parseMediaType("image/webp"))
				.body(image);
	}
}
