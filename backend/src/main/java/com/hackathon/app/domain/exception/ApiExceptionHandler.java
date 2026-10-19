package com.hackathon.app.domain.exception;

import java.util.LinkedHashMap;
import java.util.NoSuchElementException;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/** Единый формат ошибок (RFC 9457 ProblemDetail). Валидацию @Valid обрабатывает базовый класс. */
@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {

	@ExceptionHandler(NoSuchElementException.class)
	ProblemDetail notFound(NoSuchElementException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
	}

	@ExceptionHandler(BadRequestException.class)
	ProblemDetail badRequest(BadRequestException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
	}

	@ExceptionHandler(UnauthorizedException.class)
	ProblemDetail unauthorized(UnauthorizedException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
	}

	@ExceptionHandler(ForbiddenException.class)
	ProblemDetail forbidden(ForbiddenException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, e.getMessage());
	}

	@ExceptionHandler(ConflictException.class)
	ProblemDetail conflict(ConflictException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
	}

	@ExceptionHandler(ServiceUnavailableException.class)
	ProblemDetail unavailable(ServiceUnavailableException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE, e.getMessage());
	}

	/** Файл больше spring.servlet.multipart.max-file-size: 413 с понятным текстом вместо английского по умолчанию. */
	@Override
	protected ResponseEntity<Object> handleMaxUploadSizeExceededException(MaxUploadSizeExceededException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		ex.getBody().setDetail("Файл слишком большой: максимум 10 МБ");
		return super.handleMaxUploadSizeExceededException(ex, headers, status, request);
	}

	/**
	 * @Valid: в detail — первая ошибка по-русски (фронт показывает detail как есть), в errors — все по полям.
	 * Сообщение без кириллицы (стандартное английское) дополняем именем поля, чтобы было понятно, что исправить.
	 */
	@Override
	protected ResponseEntity<Object> handleMethodArgumentNotValid(MethodArgumentNotValidException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		var errors = new LinkedHashMap<String, String>();
		ex.getBindingResult().getFieldErrors().forEach(e -> errors.putIfAbsent(e.getField(), message(e)));
		ex.getBody().setDetail(errors.isEmpty() ? "Проверьте заполнение формы" : errors.values().iterator().next());
		ex.getBody().setProperty("errors", errors);
		return super.handleMethodArgumentNotValid(ex, headers, status, request);
	}

	/** Тело не JSON или поле не того типа. */
	@Override
	protected ResponseEntity<Object> handleHttpMessageNotReadable(HttpMessageNotReadableException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		var body = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST,
				"Неверный формат запроса: проверьте JSON и типы полей");
		return handleExceptionInternal(ex, body, headers, status, request);
	}

	private static String message(FieldError error) {
		var text = error.getDefaultMessage() == null ? "неверное значение" : error.getDefaultMessage();
		return text.chars().anyMatch(c -> Character.UnicodeBlock.of(c) == Character.UnicodeBlock.CYRILLIC)
				? text
				: "Поле «" + error.getField() + "»: " + text;
	}

	@Override
	protected ResponseEntity<Object> handleMissingServletRequestPart(MissingServletRequestPartException ex,
			HttpHeaders headers, HttpStatusCode status, WebRequest request) {
		ex.getBody().setDetail("Выберите файл для загрузки");
		return super.handleMissingServletRequestPart(ex, headers, status, request);
	}
}
