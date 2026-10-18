package com.hackathon.app.rest;

import java.time.Instant;

import com.hackathon.app.dto.PingResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "ping")
@RestController
// produces=JSON обязателен: иначе в OpenAPI будет */* и Orval сгенерит string вместо типа
@RequestMapping(path = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
class PingController {

	@GetMapping("/ping")
	PingResponse ping() {
		return new PingResponse("ok", Instant.now());
	}
}
