package com.hackathon.app.e2e.support;

import org.springframework.http.HttpStatus;

/**
 * Запрос тестового API вернул ошибку (4xx/5xx). Несёт статус и человекочитаемый detail из ProblemDetail,
 * чтобы тест проверял их одной строкой через {@link ApiAssertions#assertThatApi}.
 */
public class ApiCallFailed extends RuntimeException {

	private final HttpStatus status;
	private final String detail;

	public ApiCallFailed(String request, HttpStatus status, String detail, String body) {
		super(request + " -> " + status.value() + " " + (detail != null ? detail : body));
		this.status = status;
		this.detail = detail;
	}

	public HttpStatus status() {
		return status;
	}

	/** Текст ошибки для человека; null, если ответ не ProblemDetail. */
	public String detail() {
		return detail;
	}
}
