package com.hackathon.app.service;

import java.util.EnumMap;
import java.util.Map;
import java.util.regex.Pattern;

import com.hackathon.app.entity.Organization.ContactType;
import com.hackathon.app.exception.BadRequestException;

/** Проверка и нормализация контактов анкеты: пробелы обрезаются, пустые значения отбрасываются. */
final class OrganizationContacts {

	private static final Pattern PHONE_CHARS = Pattern.compile("^\\+?[0-9 ()\\-]+$");
	private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
	private static final Pattern TELEGRAM = Pattern.compile(
			"^(@[A-Za-z0-9_]{5,32}|(https?://)?t\\.me/[A-Za-z0-9_]{5,32}/?)$");
	private static final Pattern VK = Pattern.compile("^(https?://)?(m\\.)?vk\\.com/[A-Za-z0-9_.\\-]+/?$");
	private static final Pattern MAX = Pattern.compile("^(https?://)?max\\.ru/\\S+$");
	private static final Pattern WEBSITE = Pattern.compile(
			"^https?://[A-Za-z0-9\\-]+(\\.[A-Za-z0-9\\-]+)*\\.[A-Za-z]{2,}(:\\d+)?(/\\S*)?$");

	private OrganizationContacts() {
	}

	static Map<ContactType, String> normalize(Map<ContactType, String> contacts) {
		var result = new EnumMap<ContactType, String>(ContactType.class);
		if (contacts != null) {
			contacts.forEach((type, raw) -> {
				if (type == null || raw == null || raw.isBlank()) {
					return;
				}
				var value = raw.trim();
				if (!valid(type, value)) {
					throw new BadRequestException(error(type));
				}
				result.put(type, value);
			});
		}
		if (result.isEmpty()) {
			throw new BadRequestException("Укажите хотя бы один контакт");
		}
		return result;
	}

	private static boolean valid(ContactType type, String value) {
		return switch (type) {
			case PHONE, WHATSAPP -> phone(value);
			case EMAIL -> EMAIL.matcher(value).matches();
			case TELEGRAM -> TELEGRAM.matcher(value).matches();
			case VK -> VK.matcher(value).matches();
			case MAX -> MAX.matcher(value).matches() || phone(value);
			case WEBSITE -> WEBSITE.matcher(value).matches();
		};
	}

	/** Цифры с разделителями (пробел, скобки, дефис) и необязательным + в начале; всего 10–15 цифр. */
	private static boolean phone(String value) {
		if (!PHONE_CHARS.matcher(value).matches()) {
			return false;
		}
		long digits = value.chars().filter(Character::isDigit).count();
		return digits >= 10 && digits <= 15;
	}

	private static String error(ContactType type) {
		return switch (type) {
			case PHONE -> "Неверный формат телефона: нужно 10–15 цифр, например +7 900 123-45-67";
			case WHATSAPP -> "Неверный номер WhatsApp: нужно 10–15 цифр, например +7 900 123-45-67";
			case EMAIL -> "Неверный формат почты, например club@example.ru";
			case TELEGRAM -> "Укажите Telegram как @имя или ссылку https://t.me/имя";
			case VK -> "Укажите ссылку ВКонтакте, например https://vk.com/club";
			case MAX -> "Укажите ссылку https://max.ru/... или номер телефона для MAX";
			case WEBSITE -> "Укажите адрес сайта, начиная с http:// или https://";
		};
	}
}
