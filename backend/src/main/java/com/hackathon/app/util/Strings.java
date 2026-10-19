package com.hackathon.app.util;

public final class Strings {

	private Strings() {
	}

	/** Обрезает пробелы; пустая строка или строка из пробелов становится null. */
	public static String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.trim();
	}
}
