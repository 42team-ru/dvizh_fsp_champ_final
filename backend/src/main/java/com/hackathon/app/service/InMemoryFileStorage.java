package com.hackathon.app.service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Файлы в памяти процесса (app.storage.type = memory): для тестов и запуска без MinIO. После рестарта пусто. */
@Component
@ConditionalOnProperty(name = "app.storage.type", havingValue = "memory")
class InMemoryFileStorage implements FileStorage {

	private final Map<String, byte[]> objects = new ConcurrentHashMap<>();

	@Override
	public void put(String key, byte[] content, String contentType) {
		objects.put(key, content.clone());
	}

	@Override
	public InputStream get(String key) {
		var content = objects.get(key);
		if (content == null) {
			throw new NoSuchElementException("Файл не найден");
		}
		return new ByteArrayInputStream(content);
	}

	@Override
	public void delete(String key) {
		objects.remove(key);
	}
}
