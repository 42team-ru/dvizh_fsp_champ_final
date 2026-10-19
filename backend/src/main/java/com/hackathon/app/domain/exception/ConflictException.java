package com.hackathon.app.domain.exception;

public class ConflictException extends RuntimeException {

	public ConflictException(String message) {
		super(message);
	}
}
