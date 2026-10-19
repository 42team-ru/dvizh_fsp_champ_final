package com.hackathon.app.service;

import java.io.InputStream;
import java.net.URI;
import java.util.NoSuchElementException;

import com.hackathon.app.config.StorageProperties;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

/**
 * Файлы в S3-совместимом хранилище (MinIO). Бакет создаётся при старте, если его нет.
 * Path-style адреса (http://host:9000/bucket/key) — так MinIO работает без настройки DNS.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.storage.type", havingValue = "s3", matchIfMissing = true)
class S3FileStorage implements FileStorage {

	private final S3Client s3;
	private final String bucket;

	S3FileStorage(StorageProperties props) {
		this.bucket = props.bucket();
		this.s3 = S3Client.builder()
				.endpointOverride(URI.create(props.endpoint()))
				.region(Region.of(props.region()))
				.credentialsProvider(StaticCredentialsProvider.create(
						AwsBasicCredentials.create(props.accessKey(), props.secretKey())))
				.forcePathStyle(true)
				.httpClient(UrlConnectionHttpClient.create())
				// Контрольные суммы только где обязательны: не все S3-совместимые серверы понимают новые заголовки AWS
				.requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
				.responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
				.build();
		ensureBucket(props.endpoint());
	}

	private void ensureBucket(String endpoint) {
		try {
			s3.headBucket(b -> b.bucket(bucket));
		}
		catch (NoSuchBucketException _) {
			s3.createBucket(b -> b.bucket(bucket));
			log.info("S3 bucket created: bucket={}, endpoint={}", bucket, endpoint);
		}
	}

	@Override
	public void put(String key, byte[] content, String contentType) {
		s3.putObject(b -> b.bucket(bucket).key(key).contentType(contentType).contentLength((long) content.length),
				RequestBody.fromBytes(content));
	}

	@Override
	public InputStream get(String key) {
		try {
			return s3.getObject(b -> b.bucket(bucket).key(key));
		}
		catch (NoSuchKeyException _) {
			throw new NoSuchElementException("Файл не найден");
		}
	}

	@Override
	public void delete(String key) {
		s3.deleteObject(b -> b.bucket(bucket).key(key));
	}

	@PreDestroy
	void close() {
		s3.close();
	}
}
