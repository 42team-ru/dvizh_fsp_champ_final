package com.hackathon.app.service;

import java.time.Duration;
import java.util.EnumSet;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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
 * Фоновая оценка текстов нейросетью: сразу после коммита (в виртуальном потоке, запрос пользователя не ждёт)
 * и подметальщиком по расписанию — для проверок, которые не удались (модель ещё качается, перезапуск).
 * Сомнительное — в очередь админа; явная угроза, травля или ненависть в сообщении — скрывается сразу.
 */
@Slf4j
@Service
public class ModerationService {

	/** Это скрывается автоматически, если модель уверена (violation, severity 3); реклама — если её нашёл и словарь. */
	private static final EnumSet<ModerationCategory> AUTO_HIDE = EnumSet.of(ModerationCategory.THREAT,
			ModerationCategory.HATE, ModerationCategory.HARASSMENT);
	private static final int SWEEP_BATCH = 20;

	static final Map<ModerationCategory, String> LABELS = Map.of(
			ModerationCategory.PROFANITY, "нецензурная брань",
			ModerationCategory.INSULT, "оскорбления",
			ModerationCategory.HARASSMENT, "травля",
			ModerationCategory.HATE, "разжигание ненависти",
			ModerationCategory.THREAT, "угрозы",
			ModerationCategory.SEXUAL, "непристойности",
			ModerationCategory.SPAM, "реклама",
			ModerationCategory.OTHER, "нарушение правил");

	private final ModerationCheckRepository checks;
	private final ModerationCheckMapper mapper;
	private final LlmModerationClient llm;
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
			ModerationProperties properties, CommentRepository comments, CommentMapper commentMapper,
			EventRepository events, NotificationSubjects notificationSubjects, DbTimeRepository dbTime,
			ContentGuard contentGuard, PlatformTransactionManager transactions) {
		this.contentGuard = contentGuard;
		this.checks = checks;
		this.mapper = mapper;
		this.llm = llm;
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

	/** Текст сохранён — оцениваем в фоне, не задерживая ответ пользователю. */
	@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
	public void onRequested(ContentGuard.ModerationRequested event) {
		Thread.ofVirtual().name("moderation-", 0).start(() -> process(event.checkId()));
	}

	/** Проверки, которые не удалось оценить сразу. */
	@Scheduled(fixedDelayString = "${app.moderation.sweep-delay:PT1M}", initialDelayString = "${app.moderation.sweep-delay:PT1M}")
	public void sweep() {
		if (!properties.schedulingEnabled() || !llm.enabled()) {
			return;
		}
		var before = dbTime.now().minus(properties.llm().timeout().plus(Duration.ofSeconds(30)));
		var ids = readTx.execute(_ -> checks.pendingIds(before, PageRequest.of(0, SWEEP_BATCH)));
		ids.forEach(this::process);
	}

	/** Сбросить оценку и решение и спросить модель заново (кнопка админа «Проверить ещё раз»). */
	public void recheck(UUID checkId) {
		tx.executeWithoutResult(_ -> {
			var check = checks.findByIdForUpdate(checkId)
					.orElseThrow(() -> new NoSuchElementException(AdminModerationService.NOT_FOUND));
			var found = contentGuard.heuristics(check.getTargetType(), check.getTextSnapshot());
			mapper.recheck(check, found.categories(), found.explanation());
			checks.saveAndFlush(check);
		});
		process(checkId);
	}

	/** Спросить модель и записать оценку. Синхронно: вызывают фон, подметальщик и «Проверить ещё раз». */
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
			var verdict = llm.classify(snapshot);
			tx.executeWithoutResult(_ -> apply(checkId, snapshot, verdict));
		}
		catch (RuntimeException e) {
			log.warn("Не удалось оценить текст: checkId={}", checkId, e);
		}
		finally {
			inFlight.remove(checkId);
		}
	}

	private void apply(UUID checkId, String snapshot, Optional<LlmModerationClient.Verdict> result) {
		var check = checks.findByIdForUpdate(checkId).orElse(null);
		// пока модель думала, текст поправили (его оценит следующий запуск) или админ уже решил
		if (check == null || check.getStatus() != ModerationStatus.PENDING || !snapshot.equals(check.getTextSnapshot())) {
			return;
		}
		var now = dbTime.now();
		if (result.isEmpty()) {
			mapper.failedAttempt(check);
			if (check.getAttempts() >= properties.maxAttempts()) {
				// модель так и не ответила: остаётся оценка словаря
				mapper.fallback(check, now);
			}
			checks.saveAndFlush(check);
			return;
		}
		var verdict = result.get();
		boolean clean = verdict.ok() || (verdict.severity() == 0 && verdict.categories().isEmpty());
		var categories = clean ? EnumSet.noneOf(ModerationCategory.class)
				: verdict.categories().isEmpty() ? EnumSet.of(ModerationCategory.OTHER) : EnumSet.copyOf(verdict.categories());
		// реклама скрывается, только если её видят и словарь, и модель: одной маленькой модели тут мало
		boolean spamTwice = check.getSource() == ModerationSource.HEURISTIC
				&& check.getCategories().contains(ModerationCategory.SPAM) && categories.contains(ModerationCategory.SPAM)
				&& verdict.severity() >= 2;
		boolean hideWorthy = !clean && properties.autoHide() && verdict.violation()
				&& ((verdict.severity() >= 3 && categories.stream().anyMatch(AUTO_HIDE::contains)) || spamTwice);
		boolean hidden = check.getTargetType() == ModerationTarget.COMMENT
				&& syncAutoHidden(check.getTargetId(), hideWorthy, categories);
		if (clean) {
			mapper.assess(check, check.getCategories().isEmpty() ? ModerationStatus.CLEAN : ModerationStatus.FLAGGED,
					categories, 0, null, now);
			checks.saveAndFlush(check);
			return;
		}
		mapper.assess(check, hidden ? ModerationStatus.AUTO_HIDDEN : ModerationStatus.FLAGGED, categories,
				verdict.severity(), verdict.reason(), now);
		checks.saveAndFlush(check);
		log.info("Модерация: checkId={}, target={} {}, status={}, categories={}", checkId, check.getTargetType(),
				check.getTargetId(), check.getStatus(), categories);
	}

	/**
	 * Видимость сообщения по оценке модели; true — сообщение скрыто системой. Скрывает от имени системы
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
		var shown = categories.stream().anyMatch(AUTO_HIDE::contains)
				? categories.stream().filter(AUTO_HIDE::contains) : Stream.of(ModerationCategory.SPAM);
		var reason = "Скрыто автоматически: " + shown.map(LABELS::get).collect(Collectors.joining(", "));
		commentMapper.moderate(comment, true, dbTime.now(), null, reason);
		comments.saveAndFlush(comment);
		notificationSubjects.hidden(event, comment, null);
		return true;
	}
}
