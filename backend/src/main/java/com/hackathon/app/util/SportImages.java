package com.hackathon.app.util;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.hackathon.app.domain.dto.FocusPoint;
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

	/**
	 * Где на иллюстрации голова персонажа (% ширины, % высоты): широкие превью обрезаются вокруг неё, а не по центру.
	 * Замерено по файлам; новая картинка без строки здесь получает точку {@code default}.
	 */
	private static final Map<String, FocusPoint> FOCUS = Map.ofEntries(
			Map.entry("badminton", new FocusPoint(42, 25)),
			Map.entry("basketball", new FocusPoint(55, 16)),
			Map.entry("boxing", new FocusPoint(52, 12)),
			Map.entry("checkers", new FocusPoint(53, 19)),
			Map.entry("chess", new FocusPoint(55, 20)),
			Map.entry("climbing", new FocusPoint(47, 20)),
			Map.entry("cycling", new FocusPoint(52, 15)),
			Map.entry("dance", new FocusPoint(47, 18)),
			Map.entry("default", new FocusPoint(50, 20)),
			Map.entry("drone_racing", new FocusPoint(45, 18)),
			Map.entry("esports", new FocusPoint(48, 27)),
			Map.entry("fitness", new FocusPoint(50, 15)),
			Map.entry("football", new FocusPoint(47, 15)),
			Map.entry("hockey", new FocusPoint(55, 17)),
			Map.entry("martial_arts", new FocusPoint(50, 12)),
			Map.entry("nordic_walking", new FocusPoint(53, 16)),
			Map.entry("paralympic", new FocusPoint(58, 27)),
			Map.entry("robotics", new FocusPoint(55, 22)),
			Map.entry("running", new FocusPoint(55, 16)),
			Map.entry("skating", new FocusPoint(62, 14)),
			Map.entry("skiing", new FocusPoint(58, 16)),
			Map.entry("sport_programming", new FocusPoint(43, 21)),
			Map.entry("swimming", new FocusPoint(73, 50)),
			Map.entry("table_tennis", new FocusPoint(45, 16)),
			Map.entry("tennis", new FocusPoint(55, 21)),
			// лицо ниже мяча: точка между ними, чтобы в кадр попало и то и другое
			Map.entry("volleyball", new FocusPoint(50, 38)),
			Map.entry("workout", new FocusPoint(48, 12)),
			Map.entry("yoga", new FocusPoint(50, 12)),
			Map.entry("зарядка", new FocusPoint(50, 22)),
			Map.entry("петанк", new FocusPoint(53, 17)));

	/** Ссылка на картинку вида; кириллический slug своих видов кодируется в URL. */
	public static String url(String slug) {
		return URL_PREFIX + UriUtils.encodePathSegment(file(slug), StandardCharsets.UTF_8) + ".webp";
	}

	/** Есть ли у вида своя иллюстрация в classpath, а не общая заглушка. */
	public static boolean hasOwn(String slug) {
		return !"default".equals(file(slug));
	}

	/** Точка фокуса картинки вида — голова персонажа. */
	public static FocusPoint focus(String slug) {
		return FOCUS.getOrDefault(file(slug), FOCUS.get("default"));
	}

	/** Имя файла без расширения: свой файл вида или общий default. */
	private static String file(String slug) {
		return slug != null && EXISTS.computeIfAbsent(slug, s -> new ClassPathResource("sport-images/" + s + ".webp").exists())
				? slug
				: "default";
	}
}
