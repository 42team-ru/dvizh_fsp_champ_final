package com.hackathon.app.domain.exception;

/** Нужная серверу внешняя часть недоступна (например, Python для импорта вещей бобра): 503. */
public class ServiceUnavailableException extends RuntimeException {

	public ServiceUnavailableException(String message, Throwable cause) {
		super(message, cause);
	}
}
