package com.hackathon.app.domain.dto;

import java.io.InputStream;

/** Содержимое файла для ответа контроллера. attachment = скачать (документ), иначе показать в браузере. */
public record FileDownload(String name, String contentType, long size, boolean attachment, InputStream content) {
}
