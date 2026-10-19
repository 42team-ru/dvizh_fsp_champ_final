package com.hackathon.app.util;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import lombok.experimental.UtilityClass;
import org.springframework.core.io.ClassPathResource;
import org.springframework.web.util.UriUtils;

/**
 * Ссылка на иллюстрацию вида спорта для поля {@code imageUrl}. Файлы лежат в classpath {@code sport-images/<slug>.webp}
 * и раздаются как статика ({@code SportImagesConfig}), поэтому отдельного эндпоинта и запроса в базу за картинкой нет.
 * Вид без своего файла (в том числе пользовательский) получает общую {@code default.webp}: новый вид не требует кода.
 */
@UtilityClass
public class SportImages {

	/** Путь, по которому статика доступна снаружи: через Caddy на бэк проксируется только /api. */
	public static final String URL_PREFIX = "/api/sport-images/";
	/** Папка с файлами в classpath. */
	public static final String LOCATION = "classpath:/sport-images/";

	/** Есть ли файл для slug: справочник почти не меняется, поэтому проверка classpath кешируется. */
	private static final Map<String, Boolean> EXISTS = new ConcurrentHashMap<>();

	/** Ссылка на картинку вида; кириллический slug своих видов кодируется в URL. */
	public static String url(String slug) {
		var file = slug != null && EXISTS.computeIfAbsent(slug, s -> new ClassPathResource("sport-images/" + s + ".webp").exists())
				? slug
				: "default";
		return URL_PREFIX + UriUtils.encodePathSegment(file, StandardCharsets.UTF_8) + ".webp";
	}
}
