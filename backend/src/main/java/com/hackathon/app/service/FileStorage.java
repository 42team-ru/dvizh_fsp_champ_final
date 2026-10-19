package com.hackathon.app.service;

import java.io.InputStream;

/** Где лежат байты файлов. Метаданные и права — в FileService, здесь только ключ → содержимое. */
public interface FileStorage {

	void put(String key, byte[] content, String contentType);

	/** Поток содержимого; вызывающий закрывает его. NoSuchElementException, если объекта нет. */
	InputStream get(String key);

	/** Удаление несуществующего ключа — не ошибка. */
	void delete(String key);
}
