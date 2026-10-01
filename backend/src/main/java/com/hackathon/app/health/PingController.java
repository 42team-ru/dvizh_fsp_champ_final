package com.hackathon.app.health;

import java.time.Instant;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
// produces=JSON обязателен: иначе в OpenAPI будет */* и Orval сгенерит string вместо типа
@RequestMapping(path = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
class PingController {

	record PingResponse(String status, Instant time) {}

	@GetMapping("/ping")
	PingResponse ping() {
		return new PingResponse("ok", Instant.now());
	}
}
