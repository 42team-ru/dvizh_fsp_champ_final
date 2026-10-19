package com.hackathon.app.rest;

import java.util.List;

import com.hackathon.app.dto.SportResponse;
import com.hackathon.app.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "sports")
@RestController
@RequestMapping(path = "/api/sports", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class SportController {

	private final EventService events;

	@GetMapping
	@Operation(operationId = "sports_list")
	List<SportResponse> list() {
		log.info("Endpoint called: GET /api/sports");
		var response = events.sports();
		log.info("Endpoint response: GET /api/sports, count={}", response.size());
		return response;
	}
}
