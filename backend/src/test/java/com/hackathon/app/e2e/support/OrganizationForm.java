package com.hackathon.app.e2e.support;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Анкета организации для тестов: по умолчанию валидная (название, описание, город, телефон, шахматы).
 * <pre>{@code
 * OrganizationForm.valid().name("Ладья").contact("TELEGRAM", "@ladya")
 * }</pre>
 */
public final class OrganizationForm {

	private final Map<String, Object> fields = new LinkedHashMap<>();
	private final Map<String, String> contacts = new LinkedHashMap<>();

	private OrganizationForm() {
		fields.put("name", TestApi.uniqueName("Клуб "));
		fields.put("description", "Любительский спортивный клуб");
		fields.put("city", "Красноярск");
		fields.put("sportNames", java.util.List.of("Шахматы"));
		contacts.put("PHONE", "+7 900 000-00-00");
	}

	public static OrganizationForm valid() {
		return new OrganizationForm();
	}

	public OrganizationForm name(String name) {
		return with("name", name);
	}

	public OrganizationForm description(String description) {
		return with("description", description);
	}

	/** Контакт по типу ContactType: PHONE, EMAIL, TELEGRAM, VK, WHATSAPP, MAX, WEBSITE. */
	public OrganizationForm contact(String type, String value) {
		contacts.put(type, value);
		return this;
	}

	/** Убрать все контакты: анкета без единого контакта невалидна. */
	public OrganizationForm noContacts() {
		contacts.clear();
		return this;
	}

	/** Виды спорта своими названиями (как в форме): заменяют умолчание. */
	public OrganizationForm sports(String... names) {
		return with("sportNames", java.util.List.of(names));
	}

	public OrganizationForm with(String field, Object value) {
		fields.put(field, value);
		return this;
	}

	public OrganizationForm without(String field) {
		fields.remove(field);
		return this;
	}

	public Object get(String field) {
		return fields.get(field);
	}

	public Map<String, Object> toMap() {
		var map = new LinkedHashMap<>(fields);
		map.put("contacts", new LinkedHashMap<>(contacts));
		return map;
	}
}
