package com.hackathon.app.rest;

import java.util.List;

import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.service.SportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
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
			description = "Без query — весь справочник по алфавиту; с query — поиск по подстроке без учёта регистра, пробелов и ё/е, затем похожие с опечаткой («падэл» → «Падел»).")
	List<SportResponse> search(@Parameter(description = "Часть названия", example = "фут")
			@RequestParam(required = false) String query) {
		log.info("Endpoint called: GET /api/sports, query={}", query);
		var response = sports.search(query);
		log.info("Endpoint response: GET /api/sports, count={}", response.size());
		return response;
	}

}
