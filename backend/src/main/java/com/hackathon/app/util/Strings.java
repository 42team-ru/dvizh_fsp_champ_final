package com.hackathon.app.util;

import lombok.experimental.UtilityClass;

/**
 * Подключён в MappingConfig: MapStruct прогоняет через него каждое поле String → String, поэтому других таких методов тут нет.
 * static пишем явно: MapStruct видит класс раньше, чем Lombok сделает методы статическими, и иначе внедрял бы его как бин.
 */
@UtilityClass
public class Strings {

	/** Обрезает пробелы; пустая строка или строка из пробелов становится null. */
	public static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}
}
