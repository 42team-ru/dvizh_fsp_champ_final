package com.hackathon.app.rest;

import java.io.IOException;
import java.io.UncheckedIOException;

import com.hackathon.app.domain.dto.FileUpload;
import org.springframework.web.multipart.MultipartFile;

/** Multipart-файл → FileUpload для сервиса. Размер ограничен spring.servlet.multipart, так что читаем целиком. */
final class Uploads {

	private Uploads() {
	}

	static FileUpload of(MultipartFile file) {
		try {
			return new FileUpload(file.getOriginalFilename(), file.getBytes());
		}
		catch (IOException e) {
			throw new UncheckedIOException("Не удалось прочитать загруженный файл", e);
		}
	}

	/** Для логов: без содержимого. */
	static String describe(MultipartFile file) {
		return "{name=" + file.getOriginalFilename() + ", size=" + file.getSize() + ", type=" + file.getContentType() + "}";
	}
}
