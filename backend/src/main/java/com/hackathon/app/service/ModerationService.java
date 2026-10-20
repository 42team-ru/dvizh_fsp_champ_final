package com.hackathon.app.service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

import com.hackathon.app.config.ModerationProperties;
import com.hackathon.app.domain.entity.ModerationCheck;
import com.hackathon.app.domain.enums.ModerationCategory;
import com.hackathon.app.domain.enums.ModerationSource;
import com.hackathon.app.domain.enums.ModerationStatus;
import com.hackathon.app.domain.enums.ModerationTarget;
import com.hackathon.app.domain.mapper.CommentMapper;
import com.hackathon.app.domain.mapper.ModerationCheckMapper;
import com.hackathon.app.repository.CommentRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.ModerationCheckRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Фоновая оценка текстов классификатором токсичности и нейросетью: сразу после коммита (в виртуальном потоке,
 * запрос пользователя не ждёт) и подметальщиком по расписанию — для проверок, которые не удались (модель ещё качается,
 * перезапуск). Три источника голосуют: словарь, классификатор, нейросеть. Сообщение скрывается само, если серьёзное
 * нарушение видят минимум двое; всё остальное с пометками — в очередь админа.
 */
@Slf4j
@Service
public class ModerationService {

	/** Серьёзные нарушения: за них сообщение скрывается, если согласны два источника. Оскорбление решает админ. */
	private static final EnumSet<ModerationCategory> SERIOUS = EnumSet.of(ModerationCategory.THREAT,
			ModerationCategory.HATE, ModerationCategory.HARASSMENT, ModerationCategory.SEXUAL,
			ModerationCategory.PROFANITY, ModerationCategory.SPAM);
	/** С этой серьёзности голос словаря и нейросети считается «серьёзным». */
	private static final int SERIOUS_SEVERITY = 2;
	/** Сколько источников должны счесть нарушение серьёзным, чтобы сообщение скрылось без админа. */
	private static final int VOTES_TO_HIDE = 2;
	private static final int SWEEP_BATCH = 20;

	static final Map<ModerationCategory, String> LABELS = Map.of(
			ModerationCategory.PROFANITY, "нецензурная брань",
			ModerationCategory.INSULT, "оскорбления",
			ModerationCategory.HARASSMENT, "травля",
			ModerationCategory.HATE, "разжигание ненависти",
			ModerationCategory.THREAT, "угрозы",
			ModerationCategory.SEXUAL, "непристойности",
			ModerationCategory.SPAM, "реклама",
			ModerationCategory.OFF_TOPIC, "не по теме",
			ModerationCategory.OTHER, "нарушение правил");

	private final ModerationCheckRepository checks;
	private final ModerationCheckMapper mapper;
	private final LlmModerationClient llm;
	private final ToxicityClient toxicity;
	private final ModerationProperties properties;
	private final CommentRepository comments;
	private final CommentMapper commentMapper;
	private final EventRepository events;
	private final NotificationSubjects notificationSubjects;
	private final DbTimeRepository dbTime;
	private final ContentGuard contentGuard;
	private final TransactionTemplate tx;
	private final TransactionTemplate readTx;
	/** Проверки, которые уже ждут модель: подметальщик не ставит их второй раз. */
	private final Set<UUID> inFlight = ConcurrentHashMap.newKeySet();

	public ModerationService(ModerationCheckRepository checks, ModerationCheckMapper mapper, LlmModerationClient llm,
			ToxicityClient toxicity, ModerationProperties properties, CommentRepository comments, CommentMapper commentMapper,
			EventRepository events, NotificationSubjects notificationSubjects, DbTimeRepository dbTime,
			ContentGuard contentGuard, PlatformTransactionManager transactions) {
		this.contentGuard = contentGuard;
		this.checks = checks;
		this.mapper = mapper;
		this.llm = llm;
		this.toxicity = toxicity;
		this.properties = properties;
		this.comments = comments;
		this.commentMapper = commentMapper;
		this.events = events;
		this.notificationSubjects = notificationSubjects;
		this.dbTime = dbTime;
		this.tx = new TransactionTemplate(transactions);
		this.readTx = new TransactionTemplate(transactions);
		this.readTx.setReadOnly(true);
	}

	/** Включена хотя бы одна модель: нейросеть или классификатор. */
	public boolean anyModel() {
		return llm.enabled() || toxicity.enabled();
	}

	/** Текст сохранён — оцениваем в фоне, не задерживая ответ пользователю. */
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onRequested(ContentGuard.ModerationRequested event) {
		Thread.ofVirtual().name("moderation-", 0).start(() -> process(event.checkId()));
	}

	/** Проверки, которые не удалось оценить сразу. */
	@Scheduled(fixedDelayString = "${app.moderation.sweep-delay:PT1M}", initialDelayString = "${app.moderation.sweep-delay:PT1M}")
	public void sweep() {
		if (!properties.schedulingEnabled() || !anyModel()) {
			return;
		}
		var timeout = llm.enabled() ? properties.llm().timeout() : properties.classifier().timeout();
		var before = dbTime.now().minus(timeout.plus(Duration.ofSeconds(30)));
		var ids = readTx.execute(_ -> checks.pendingIds(before, PageRequest.of(0, SWEEP_BATCH)));
		ids.forEach(this::process);
	}

	/** Сбросить оценку и решение и спросить модель заново (кнопка админа «Проверить ещё раз»). */
	public void recheck(UUID checkId) {
		tx.executeWithoutResult(_ -> {
			var check = checks.findByIdForUpdate(checkId)
					.orElseThrow(() -> new NoSuchElementException(AdminModerationService.NOT_FOUND));
			var found = contentGuard.heuristics(check.getTargetType(), check.getTextSnapshot());
			mapper.recheck(check, found.categories(), found.severity(), found.explanation());
			checks.saveAndFlush(check);
		});
		process(checkId);
	}

	/** Спросить модели и записать оценку. Синхронно: вызывают фон, подметальщик и «Проверить ещё раз». */
	public void process(UUID checkId) {
		if (!inFlight.add(checkId)) {
			return;
		}
		try {
			var snapshot = readTx.execute(_ -> checks.findById(checkId)
					.filter(c -> c.getStatus() == ModerationStatus.PENDING)
					.map(ModerationCheck::getTextSnapshot).orElse(null));
			if (snapshot == null) {
				return;
			}
			var toxic = toxicity.classify(snapshot);
			var verdict = llm.classify(snapshot);
			tx.executeWithoutResult(_ -> apply(checkId, snapshot, toxic, verdict));
		}
		catch (RuntimeException e) {
			log.warn("Не удалось оценить текст: checkId={}", checkId, e);
		}
		finally {
			inFlight.remove(checkId);
		}
	}

	private void apply(UUID checkId, String snapshot, Optional<ToxicityClient.Toxicity> toxic,
			Optional<LlmModerationClient.Verdict> result) {
		var check = checks.findByIdForUpdate(checkId).orElse(null);
		// пока модели думали, текст поправили (его оценит следующий запуск) или админ уже решил
		if (check == null || check.getStatus() != ModerationStatus.PENDING || !snapshot.equals(check.getTextSnapshot())) {
			return;
		}
		var now = dbTime.now();
		// включённая модель не ответила — пробуем позже, а после maxAttempts решаем по тому, что есть
		boolean missing = (llm.enabled() && result.isEmpty()) || (toxicity.enabled() && toxic.isEmpty());
		if (missing) {
			mapper.failedAttempt(check);
			if (check.getAttempts() < properties.maxAttempts()) {
				checks.saveAndFlush(check);
				return;
			}
			if (result.isEmpty() && toxic.isEmpty()) {
				mapper.fallback(check, now); // остаётся оценка словаря
				checks.saveAndFlush(check);
				return;
			}
		}
		var vote = vote(check, toxic, result);
		boolean hidden = check.getTargetType() == ModerationTarget.COMMENT
				&& syncAutoHidden(check.getTargetId(), properties.autoHide() && vote.hide(), vote.categories());
		var status = hidden ? ModerationStatus.AUTO_HIDDEN
				: vote.categories().isEmpty() && !vote.suspicious() ? ModerationStatus.CLEAN : ModerationStatus.FLAGGED;
		mapper.assess(check, status, vote.categories(), vote.severity(), vote.explanation(),
				result.isPresent() ? ModerationSource.LLM : ModerationSource.CLASSIFIER, now);
		checks.saveAndFlush(check);
		log.info("Модерация: checkId={}, target={} {}, status={}, categories={}, votes={}", checkId,
				check.getTargetType(), check.getTargetId(), check.getStatus(), vote.categories(), vote.seriousVotes());
	}

	/**
	 * Итог голосования трёх источников.
	 * @param categories что показать админу и в причине скрытия
	 * @param seriousVotes сколько источников сочли нарушение серьёзным
	 * @param suspicious нейросеть сомневается — пусть посмотрит человек
	 */
	private record Vote(EnumSet<ModerationCategory> categories, int severity, String explanation, int seriousVotes,
			boolean suspicious) {
		boolean hide() {
			return seriousVotes >= VOTES_TO_HIDE;
		}
	}

	/**
	 * Каждый источник голосует «серьёзно» или нет; категории берём у словаря и классификатора, а у нейросети —
	 * только если больше никто ничего не нашёл: маленькая модель на непривычном тексте копирует ближайший пример
	 * («трахаюсь» → угроза), а словарь и классификатор категорию не выдумывают.
	 */
	private Vote vote(ModerationCheck check, Optional<ToxicityClient.Toxicity> toxic,
			Optional<LlmModerationClient.Verdict> result) {
		// словарь: его оценка уже лежит в проверке (ContentGuard.submit / recheck)
		var dictionary = check.getSource() == ModerationSource.HEURISTIC
				? EnumSet.copyOf(check.getCategories()) : EnumSet.noneOf(ModerationCategory.class);
		boolean dictionarySerious = !dictionary.isEmpty() && check.getSeverity() >= SERIOUS_SEVERITY
				&& dictionary.stream().anyMatch(SERIOUS::contains);
		var parts = new ArrayList<String>();
		if (!dictionary.isEmpty() && check.getExplanation() != null) parts.add(check.getExplanation());

		var categories = EnumSet.copyOf(dictionary);
		int severity = dictionary.isEmpty() ? 0 : check.getSeverity();
		boolean toxicSerious = false;
		if (toxic.isPresent() && toxic.get().found()) {
			var t = toxic.get();
			toxicSerious = t.serious();
			categories.addAll(t.categories());
			severity = Math.max(severity, t.severity());
			parts.add("Классификатор: " + t.summary());
		}

		boolean llmSerious = false;
		boolean suspicious = false;
		if (result.isPresent()) {
			var v = result.get();
			boolean clean = v.ok() || (v.severity() == 0 && v.categories().isEmpty());
			if (!clean) {
				var llmCategories = v.categories().isEmpty() ? EnumSet.of(ModerationCategory.OTHER) : EnumSet.copyOf(v.categories());
				llmSerious = v.violation() && v.severity() >= SERIOUS_SEVERITY && llmCategories.stream().anyMatch(SERIOUS::contains);
				suspicious = !v.violation();
				severity = Math.max(severity, v.severity());
				if (categories.isEmpty()) {
					categories.addAll(llmCategories);
				}
				// неуместное по классификатору без конкретной метки: уточняем категорией нейросети
				else if (toxic.isPresent() && toxic.get().dangerous() && dictionary.isEmpty() && toxic.get().categories().isEmpty()) {
					categories.addAll(llmCategories);
				}
				if (v.reason() != null) parts.add("Нейросеть: " + v.reason());
			}
		}
		if (categories.isEmpty() && toxic.isPresent() && toxic.get().dangerous()) {
			categories.add(ModerationCategory.OTHER);
		}
		int votes = (dictionarySerious ? 1 : 0) + (toxicSerious ? 1 : 0) + (llmSerious ? 1 : 0);
		var explanation = parts.isEmpty() ? null : String.join(" · ", parts);
		if (explanation != null && explanation.length() > 500) explanation = explanation.substring(0, 499) + "…";
		return new Vote(categories, severity, explanation, votes, suspicious);
	}

	/**
	 * Видимость сообщения по итогу голосования; true — сообщение скрыто системой. Скрывает от имени системы
	 * (hiddenById = null), а если повторная проверка нарушения не нашла — возвращает скрытое системой.
	 * Скрытое админом и удалённое автором не трогаем.
	 */
	private boolean syncAutoHidden(UUID commentId, boolean hideWorthy, EnumSet<ModerationCategory> categories) {
		var comment = comments.findById(commentId).orElse(null);
		if (comment == null || comment.getDeletedAt() != null) {
			return false;
		}
		boolean bySystem = comment.isHidden() && comment.getHiddenById() == null;
		if (comment.isHidden() && !bySystem) {
			return false; // решение админа
		}
		if (!hideWorthy) {
			if (bySystem) {
				commentMapper.moderate(comment, false, null, null, null);
				comments.saveAndFlush(comment);
			}
			return false;
		}
		if (bySystem) {
			return true;
		}
		var event = events.findById(comment.getEventId()).orElseThrow();
		var shown = categories.stream().anyMatch(SERIOUS::contains)
				? categories.stream().filter(SERIOUS::contains) : categories.stream();
		var reason = "Скрыто автоматически: " + shown.map(LABELS::get).collect(Collectors.joining(", "));
		commentMapper.moderate(comment, true, dbTime.now(), null, reason);
		comments.saveAndFlush(comment);
		notificationSubjects.hidden(event, comment, null);
		return true;
	}
}
