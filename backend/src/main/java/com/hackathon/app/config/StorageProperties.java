package com.hackathon.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Хранилище файлов. type = s3 (MinIO или любой S3-совместимый сервер) или memory (в памяти, для тестов).
 */
@ConfigurationProperties("app.storage")
public record StorageProperties(String type, String endpoint, String region, String accessKey, String secretKey,
		String bucket) {
}
