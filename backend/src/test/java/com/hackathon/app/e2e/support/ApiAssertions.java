package com.hackathon.app.e2e.support;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.springframework.http.HttpStatus;

/**
 * Проверка отказа API одной строкой:
 * <pre>{@code
 * assertThatApi(() -> petya.approve(request)).fails(FORBIDDEN, "Решение по заявке принимает только организатор");
 * }</pre>
 */
public final class ApiAssertions {

	private ApiAssertions() {
	}

	public static FailureAssert assertThatApi(ThrowingCallable call) {
		return new FailureAssert(call);
	}

	public static final class FailureAssert {

		private final ThrowingCallable call;

		private FailureAssert(ThrowingCallable call) {
			this.call = call;
		}

		/** Запрос отклонён с этим статусом; текст ошибки не важен. */
		public ApiCallFailed fails(HttpStatus status) {
			var failure = catchThrowableOfType(ApiCallFailed.class, call);
			assertThat(failure).as("запрос должен был завершиться ошибкой %s", status).isNotNull();
			assertThat(failure.status()).as("статус ответа").isEqualTo(status);
			return failure;
		}

		/** Запрос отклонён с этим статусом и ровно этим текстом для человека. */
		public ApiCallFailed fails(HttpStatus status, String detail) {
			var failure = fails(status);
			assertThat(failure.detail()).as("detail ответа").isEqualTo(detail);
			return failure;
		}
	}
}
