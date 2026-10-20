package com.hackathon.app.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import com.hackathon.app.config.ModerationProperties;
import com.hackathon.app.domain.enums.ModerationCategory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Классификатор токсичности cointegrated/rubert-tiny-toxicity (text-embeddings-inference, POST /predict):
 * вероятности меток non-toxic, insult, obscenity, threat, dangerous. Отвечает за миллисекунды и почти не ошибается
 * в сторону ложной тревоги, но видит только явное: «я тебя убью» — да, «сломаю ноги после игры» — нет.
 * Любой сбой — пустой результат.
 */
@Slf4j
@Component
public class ToxicityClient {

	/** Порог метки; у dangerous («может навредить репутации говорящего») выше — она шумнее остальных. */
	private static final double LABEL = 0.5;
	private static final double DANGEROUS = 0.8;
	private static final double CERTAIN = 0.9;

	private static final Map<String, String> NAMES = Map.of("insult", "оскорбление", "obscenity", "непристойность",
			"threat", "угроза", "dangerous", "неуместное");

	/** Вероятности меток (0–1). */
	public record Toxicity(Map<String, Double> scores) {

		private double p(String label) {
			return scores.getOrDefault(label, 0.0);
		}

		/** Конкретные нарушения: оскорбление, непристойность, угроза. */
		public Set<ModerationCategory> categories() {
			var out = EnumSet.noneOf(ModerationCategory.class);
			if (p("insult") > LABEL) out.add(ModerationCategory.INSULT);
			if (p("obscenity") > LABEL) out.add(ModerationCategory.PROFANITY);
			if (p("threat") > LABEL) out.add(ModerationCategory.THREAT);
			return out;
		}

		/** «Неуместное» без конкретной метки. */
		public boolean dangerous() {
			return p("dangerous") > DANGEROUS;
		}

		/** Серьёзное: угроза, непристойность или явно неуместное. Одно оскорбление — нет, его решает админ. */
		public boolean serious() {
			return p("threat") > LABEL || p("obscenity") > LABEL || dangerous();
		}

		/** Серьёзность по шкале модели: 3 — уверенная угроза или непристойность, 1 — только оскорбление. */
		public int severity() {
			double strongest = Math.max(p("threat"), p("obscenity"));
			if (strongest > CERTAIN) return 3;
			if (serious()) return 2;
			return p("insult") > LABEL ? 1 : 0;
		}

		public boolean found() {
			return !categories().isEmpty() || dangerous();
		}

		/** Для пояснения админу: засчитанные метки, «угроза 98%, неуместное 86%». */
		public String summary() {
			return NAMES.entrySet().stream()
					.filter(e -> p(e.getKey()) > ("dangerous".equals(e.getKey()) ? DANGEROUS : LABEL))
					.sorted((a, b) -> Double.compare(p(b.getKey()), p(a.getKey())))
					.map(e -> e.getValue() + " " + Math.round(p(e.getKey()) * 100) + "%")
					.collect(Collectors.joining(", "));
		}
	}

	private final ModerationProperties properties;
	private final ObjectMapper json;
	private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

	public ToxicityClient(ModerationProperties properties, ObjectMapper json) {
		this.properties = properties;
		this.json = json;
	}

	public boolean enabled() {
		return properties.classifier().enabled();
	}

	/** Оценить текст; пусто — классификатор выключен или недоступен. */
	public Optional<Toxicity> classify(String text) {
		if (!enabled()) {
			return Optional.empty();
		}
		var classifier = properties.classifier();
		try {
			var body = json.writeValueAsString(Map.of("inputs", text, "raw_scores", true, "truncate", true));
			var request = HttpRequest.newBuilder(URI.create(classifier.url() + "/predict"))
					.timeout(classifier.timeout())
					.header("Content-Type", "application/json")
					.POST(HttpRequest.BodyPublishers.ofString(body))
					.build();
			var response = client.send(request, HttpResponse.BodyHandlers.ofString());
			if (response.statusCode() != 200) {
				log.warn("Классификатор токсичности ответил {}", response.statusCode());
				return Optional.empty();
			}
			// raw_scores — логиты; метки независимые (multilabel), поэтому сигмоида, а не softmax
			var scores = new HashMap<String, Double>();
			for (var item : json.readTree(response.body())) {
				scores.put(item.path("label").asString(""), 1 / (1 + Math.exp(-item.path("score").asDouble())));
			}
			return Optional.of(new Toxicity(Map.copyOf(scores)));
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			return Optional.empty();
		}
		catch (Exception e) {
			log.warn("Классификатор токсичности недоступен: {}", e.toString());
			return Optional.empty();
		}
	}
}
