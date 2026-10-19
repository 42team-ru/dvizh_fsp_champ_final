package com.hackathon.app.domain.dto;

/** Файл из multipart-запроса, уже прочитанный контроллером: сервис не зависит от HTTP. */
public record FileUpload(String originalName, byte[] content) {
}
