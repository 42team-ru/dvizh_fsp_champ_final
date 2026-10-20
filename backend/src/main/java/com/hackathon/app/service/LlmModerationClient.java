package com.hackathon.app.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Semaphore;

import com.hackathon.app.config.ModerationProperties;
import com.hackathon.app.domain.enums.ModerationCategory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * Оценка текста маленькой локальной моделью (Qwen3-1.7B в llama.cpp) через OpenAI-совместимый
 * /v1/chat/completions с JSON-схемой ответа. Любой сбой — пустой результат: проверка повторится позже.
 * Ответ модели — только подсказка: она может пометить текст, а скрыть — лишь явное нарушение в сообщении.
 */
@Slf4j
@Component
public class LlmModerationClient {

	/** Оценка: ok — нарушений нет, suspicious — пусть посмотрит человек, violation — явное нарушение. */
	public record Verdict(String verdict, Set<ModerationCategory> categories, int severity, String reason) {
		public boolean ok() { return "ok".equals(verdict); }
		public boolean violation() { return "violation".equals(verdict); }
	}

	private static final List<String> VERDICTS = List.of("ok", "suspicious", "violation");

	/**
	 * Схема ответа. Порядок полей важен: llama.cpp генерирует их по порядку, и короткое пояснение
	 * до вердикта заметно снижает ложные срабатывания у маленькой модели.
	 */
	private static final Map<String, Object> SCHEMA = schema();

	private static Map<String, Object> schema() {
		var properties = new LinkedHashMap<String, Object>();
		properties.put("reason", Map.of("type", "string", "maxLength", 200));
		properties.put("categories", Map.of("type", "array", "maxItems", 3, "items", Map.of("type", "string",
				"enum", Arrays.stream(ModerationCategory.values()).map(Enum::name).toList())));
		properties.put("severity", Map.of("type", "integer", "minimum", 0, "maximum", 3));
		properties.put("verdict", Map.of("type", "string", "enum", VERDICTS));
		var schema = new LinkedHashMap<String, Object>();
		schema.put("type", "object");
		schema.put("properties", properties);
		schema.put("required", List.copyOf(properties.keySet()));
		return schema;
	}

	private final ModerationProperties properties;
	private final ObjectMapper json;
	private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
	private final Semaphore slots;
	/** Инструкция (moderation/llm-prompt.txt) и примеры ответов (moderation/llm-examples.json) — общие для всех запросов. */
	private final List<Map<String, String>> preamble;

	public LlmModerationClient(ModerationProperties properties, ObjectMapper json) {
		this.properties = properties;
		this.json = json;
		this.slots = new Semaphore(properties.llm().concurrency(), true);
		this.preamble = preamble(json);
	}

	private static List<Map<String, String>> preamble(ObjectMapper json) {
		var messages = new ArrayList<Map<String, String>>();
		messages.add(Map.of("role", "system", "content", resource("moderation/llm-prompt.txt")));
		for (var example : json.readTree(resource("moderation/llm-examples.json"))) {
			messages.add(Map.of("role", "user", "content", wrap(example.path("text").asString())));
			messages.add(Map.of("role", "assistant", "content", json.writeValueAsString(example.path("answer"))));
		}
		return List.copyOf(messages);
	}

	private static String resource(String path) {
		try (var in = new ClassPathResource(path).getInputStream()) {
			return new String(in.readAllBytes(), StandardCharsets.UTF_8).strip();
		}
		catch (IOException e) {
			throw new UncheckedIOException("Не найден файл модерации " + path, e);
		}
	}

	private static String wrap(String text) {
		return "<text>\n" + text + "\n</text>";
	}

	public boolean enabled() {
		return properties.llm().enabled();
	}

	/** Оценить текст; пусто — модель выключена, недоступна или ответила не по схеме. */
	public Optional<Verdict> classify(String text) {
		if (!enabled()) {
			return Optional.empty();
		}
		var llm = properties.llm();
		try {
			slots.acquire();
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			return Optional.empty();
		}
		try {
			var body = json.writeValueAsString(Map.of(
					"model", llm.model(),
					"temperature", 0,
					"max_tokens", 200,
					"chat_template_kwargs", Map.of("enable_thinking", false),
					"response_format", Map.of("type", "json_object", "schema", SCHEMA),
					"messages", messages(text)));
			var request = HttpRequest.newBuilder(URI.create(llm.url() + "/v1/chat/completions"))
					.timeout(llm.timeout())
					.header("Content-Type", "application/json")
					.POST(HttpRequest.BodyPublishers.ofString(body))
					.build();
			var response = client.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() != 200) {
				log.warn("Модель модерации ответила {}", response.statusCode());
				return Optional.empty();
			}
			var content = json.readTree(response.body()).path("choices").path(0).path("message").path("content").asString("");
			return Optional.of(parse(json.readTree(content)));
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			return Optional.empty();
		}
		catch (Exception e) {
			log.warn("Модель модерации недоступна: {}", e.toString());
			return Optional.empty();
		}
		finally {
			slots.release();
		}
	}

	private List<Map<String, String>> messages(String text) {
		var messages = new ArrayList<>(preamble);
		messages.add(Map.of("role", "user", "content", wrap(text)));
		return messages;
	}

	private static Verdict parse(JsonNode node) {
		var verdict = node.path("verdict").asString("");
		if (!VERDICTS.contains(verdict)) {
			throw new IllegalArgumentException("Неизвестный verdict: " + verdict);
		}
		var categories = EnumSet.noneOf(ModerationCategory.class);
		for (var c : node.path("categories")) {
			try {
				categories.add(ModerationCategory.valueOf(c.asString("")));
			}
			catch (IllegalArgumentException _) {
				categories.add(ModerationCategory.OTHER);
			}
		}
		int severity = Math.clamp(node.path("severity").asInt(0), 0, 3);
		var reason = node.path("reason").asString("").strip();
		if (reason.length() > 300) {
			reason = reason.substring(0, 300);
		}
		return new Verdict(verdict, categories, severity, reason.isEmpty() ? null : reason);
	}
}
