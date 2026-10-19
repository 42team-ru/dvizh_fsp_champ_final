package com.hackathon.app.demo;

import java.util.List;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Список демо-аккаунтов для кнопок быстрого входа. Вне демо-режима возвращает пустой список. */
@Tag(name = "demo")
@RestController
@RequestMapping(path = "/api/demo", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class DemoController {

	private final DemoService demo;

	@GetMapping("/accounts")
	@Operation(operationId = "demo_accounts")
	List<DemoAccountResponse> accounts() {
		return demo.accounts();
	}
}
