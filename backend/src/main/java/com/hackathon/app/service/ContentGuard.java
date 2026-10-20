package com.hackathon.app.service;

import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hackathon.app.config.ModerationProperties;
import com.hackathon.app.domain.enums.ModerationCategory;
import com.hackathon.app.domain.enums.ModerationDecision;
import com.hackathon.app.domain.enums.ModerationSource;
import com.hackathon.app.domain.enums.ModerationStatus;
import com.hackathon.app.domain.enums.ModerationTarget;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.mapper.ModerationCheckMapper;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.ModerationCheckRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Модерация текстов при сохранении (docs/moderation.md). Сервисы вызывают её до и после записи:
 * {@link #requireClean} — мат не сохраняем (400); {@link #submit} — текст ставится на проверку
 * (словарь сразу, нейросеть — в фоне после коммита, {@link ModerationService}).
 */
@Service
@RequiredArgsConstructor
public class ContentGuard {

	static final String COMMENT_REJECTED = "Сообщение не отправлено: уберите нецензурные слова";

	/** Проверку после коммита подхватывает ModerationService. */
	public record ModerationRequested(UUID checkId) {}

	/** Оценка словаря: мягкие признаки (грубость, спам) и пояснение для админа; пусто — ничего не нашлось. */
	public record Heuristics(Set<ModerationCategory> categories, String explanation, int severity) {
		public boolean found() { return !categories.isEmpty(); }
	}

	private final ProfanityFilter filter;
	private final ModerationCheckRepository checks;
	private final ModerationCheckMapper mapper;
	private final ModerationProperties properties;
	private final DbTimeRepository dbTime;
	private final ApplicationEventPublisher publisher;

	/** Сообщение обсуждения: с матом — 400. */
	public void requireCleanComment(String text) {
		if (filter.obscene(text).isPresent()) {
			throw new BadRequestException(COMMENT_REJECTED);
		}
	}

	/** Поля формы «подпись → текст»: первое поле с матом — 400 с его названием. */
	public void requireClean(Map<String, String> fields) {
		fields.forEach((label, text) -> {
			if (filter.obscene(text).isPresent()) {
				throw new BadRequestException("Уберите нецензурные слова из поля «" + label + "»");
			}
		});
	}

	/** Поля по порядку для requireClean и снимка; пустые пропускаются в снимке. */
	public static Map<String, String> fields(String... labelsAndTexts) {
		var out = new LinkedHashMap<String, String>();
		for (int i = 0; i + 1 < labelsAndTexts.length; i += 2) {
			out.put(labelsAndTexts[i], labelsAndTexts[i + 1]);
		}
		return out;
	}

	/** Текст для админа: «Подпись: значение» по строкам, пустые поля опущены. */
	public static String snapshot(Map<String, String> fields) {
		return fields.entrySet().stream()
				.filter(e -> e.getValue() != null && !e.getValue().isBlank())
				.map(e -> e.getKey() + ": " + e.getValue().strip())
				.collect(Collectors.joining("\n"));
	}

	/**
	 * Поставить текст на проверку в текущей транзакции. Тот же текст повторно не проверяется
	 * (в том числе уже одобренный админом). Без нейросети и классификатора оценка — сразу по словарю.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public void submit(ModerationTarget target, UUID targetId, UUID eventId, UUID authorId, String snapshot) {
		if (snapshot == null || snapshot.isBlank()) {
			return;
		}
		var existing = checks.findByTargetTypeAndTargetId(target, targetId);
		if (existing.isPresent() && snapshot.equals(existing.get().getTextSnapshot())) {
			return;
		}
		var check = existing.orElseGet(() -> mapper.toEntity(target, targetId, eventId, authorId));
		var found = heuristics(target, snapshot);
		// хотя бы одна модель включена — оцениваем в фоне, иначе остаётся оценка словаря
		boolean llm = properties.llm().enabled() || properties.classifier().enabled();
		var status = llm ? ModerationStatus.PENDING
				: found.found() ? ModerationStatus.FLAGGED : ModerationStatus.CLEAN;
		mapper.submit(check, snapshot, authorId, status, found.categories(), found.severity(),
				found.explanation(), found.found() ? ModerationSource.HEURISTIC : null, llm ? null : dbTime.now());
		var saved = checks.saveAndFlush(check);
		if (llm) {
			publisher.publishEvent(new ModerationRequested(saved.getId()));
		}
	}

	/** Словарная оценка текста; спам ищем только в сообщениях (в описаниях ссылки и телефоны уместны). */
	public Heuristics heuristics(ModerationTarget target, String snapshot) {
		var findings = filter.softSignals(snapshot, target == ModerationTarget.COMMENT);
		if (findings.isEmpty()) {
			return new Heuristics(EnumSet.noneOf(ModerationCategory.class), null, 0);
		}
		return new Heuristics(ProfanityFilter.categories(findings), "Словарь: " + findings.stream()
				.map(f -> "«" + f.fragment() + "»").distinct().collect(Collectors.joining(", ")),
				findings.stream().mapToInt(ProfanityFilter.Finding::severity).max().orElse(1));
	}

	/** Текста больше нет (автор удалил сообщение): проверка из очереди убирается. */
	@Transactional(propagation = Propagation.MANDATORY)
	public void withdraw(ModerationTarget target, UUID targetId) {
		checks.findByTargetTypeAndTargetId(target, targetId).ifPresent(checks::delete);
	}

	/**
	 * Админ принял меру сам (скрыл сообщение, снял мероприятие, вернул анкету): проверка в очереди закрывается.
	 * Нет проверки или она уже решена — ничего не делаем.
	 */
	@Transactional(propagation = Propagation.MANDATORY)
	public void resolve(ModerationTarget target, UUID targetId, ModerationDecision decision, UUID adminId) {
		checks.findByTargetTypeAndTargetId(target, targetId)
				.filter(c -> c.getStatus() == ModerationStatus.FLAGGED || c.getStatus() == ModerationStatus.AUTO_HIDDEN
						|| c.getStatus() == ModerationStatus.PENDING)
				.ifPresent(c -> {
					mapper.review(c, decision, dbTime.now(), adminId);
					checks.saveAndFlush(c);
				});
	}
}
