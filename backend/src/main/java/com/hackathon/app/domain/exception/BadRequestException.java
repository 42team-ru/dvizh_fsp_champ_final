package com.hackathon.app.domain.exception;

public class BadRequestException extends RuntimeException {

	public BadRequestException(String message) {
		super(message);
	}
}
