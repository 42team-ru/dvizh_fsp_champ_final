package com.hackathon.app.util;

import java.util.Locale;

import com.hackathon.app.domain.enums.AchievementCode;
import com.hackathon.app.domain.enums.OrganizationAwardKind;
import lombok.experimental.UtilityClass;

/**
 * Ссылки на иллюстрации достижений людей и наград организаций. Файлы лежат в classpath
 * {@code achievement-images/<код>.webp} (у наград организаций — с префиксом {@code org_}) и раздаются как статика
 * ({@code SportImagesConfig}), как и картинки видов спорта.
 */
@UtilityClass
public class AchievementImages {

	/** Путь, по которому статика доступна снаружи: через Caddy на бэк проксируется только /api. */
	public static final String URL_PREFIX = "/api/achievement-images/";
	/** Папка с файлами в classpath. */
	public static final String LOCATION = "classpath:/achievement-images/";

	public static String url(AchievementCode code) {
		return URL_PREFIX + code.name().toLowerCase(Locale.ROOT) + ".webp";
	}

	/** У «Организации месяца» код уже начинается с ORG_, префикс не удваиваем. */
	public static String url(OrganizationAwardKind kind) {
		var name = kind.name().toLowerCase(Locale.ROOT);
		return URL_PREFIX + (name.startsWith("org_") ? name : "org_" + name) + ".webp";
	}
}
