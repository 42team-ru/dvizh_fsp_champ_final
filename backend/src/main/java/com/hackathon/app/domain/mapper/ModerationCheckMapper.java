package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.domain.dto.CommentModerationResponse;
import com.hackathon.app.domain.dto.ModerationItemResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.ModerationCheck;
import com.hackathon.app.domain.enums.ModerationCategory;
import com.hackathon.app.domain.enums.ModerationDecision;
import com.hackathon.app.domain.enums.ModerationSource;
import com.hackathon.app.domain.enums.ModerationStatus;
import com.hackathon.app.domain.enums.ModerationTarget;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/** Проверки текстов. Сброс и оценка пишут null явно, поэтому сделаны вручную: сгенерированное пропустило бы null. */
@Mapper(config = MappingConfig.class, uses = UserMapper.class)
public interface ModerationCheckMapper {

	ModerationCheck toEntity(ModerationTarget targetType, UUID targetId, UUID eventId, UUID authorId);

	/** Новый текст на проверку: прежняя оценка и решение стираются, словарные признаки сразу записываются. */
	default void submit(@MappingTarget ModerationCheck check, String textSnapshot, UUID authorId,
			ModerationStatus status, Set<ModerationCategory> categories, int severity, String explanation,
			ModerationSource source, Instant checkedAt) {
		check.setTextSnapshot(textSnapshot);
		check.setAuthorId(authorId);
		check.setStatus(status);
		check.getCategories().clear();
		check.getCategories().addAll(categories);
		check.setSeverity(severity);
		check.setExplanation(explanation);
		check.setSource(source);
		check.setCheckedAt(checkedAt);
		check.setAttempts(0);
		check.setReviewedAt(null);
		check.setReviewedById(null);
		check.setDecision(null);
	}

	/** Итог голосования моделей: категории объединяются со словарными; source — кто оценивал последним. */
	default void assess(@MappingTarget ModerationCheck check, ModerationStatus status, Set<ModerationCategory> categories,
			int severity, String explanation, ModerationSource source, Instant checkedAt) {
		check.setStatus(status);
		check.getCategories().addAll(categories);
		check.setSeverity(Math.max(check.getSeverity(), severity));
		if (explanation != null) {
			check.setExplanation(explanation);
		}
		check.setSource(source);
		check.setCheckedAt(checkedAt);
	}

	/** Модель не ответила: попробуем ещё раз позже. */
	default void failedAttempt(@MappingTarget ModerationCheck check) {
		check.setAttempts(check.getAttempts() + 1);
	}

	/** Попытки кончились: остаётся оценка словаря (есть признаки — к админу, нет — чисто). */
	default void fallback(@MappingTarget ModerationCheck check, Instant checkedAt) {
		boolean flagged = !check.getCategories().isEmpty();
		check.setStatus(flagged ? ModerationStatus.FLAGGED : ModerationStatus.CLEAN);
		check.setSource(flagged ? ModerationSource.HEURISTIC : null);
		check.setCheckedAt(checkedAt);
	}

	/**
	 * Сброс к проверке нейросетью (админ попросил «Проверить ещё раз»): прежняя оценка модели, решение
	 * и попытки стираются, остаются только признаки словаря.
	 */
	default void recheck(@MappingTarget ModerationCheck check, Set<ModerationCategory> heuristic, int severity,
			String explanation) {
		check.setStatus(ModerationStatus.PENDING);
		check.getCategories().clear();
		check.getCategories().addAll(heuristic);
		check.setSeverity(heuristic.isEmpty() ? 0 : severity);
		check.setExplanation(explanation);
		check.setSource(heuristic.isEmpty() ? null : ModerationSource.HEURISTIC);
		check.setCheckedAt(null);
		check.setAttempts(0);
		check.setDecision(null);
		check.setReviewedAt(null);
		check.setReviewedById(null);
	}

	/** Решение администратора. */
	default void review(@MappingTarget ModerationCheck check, ModerationDecision decision, Instant reviewedAt,
			UUID reviewedById) {
		check.setStatus(ModerationStatus.RESOLVED);
		check.setDecision(decision);
		check.setReviewedAt(reviewedAt);
		check.setReviewedById(reviewedById);
	}

	@Mapping(target = "id", source = "check.id")
	@Mapping(target = "text", source = "check.textSnapshot")
	@Mapping(target = "updatedAt", source = "check.updatedAt")
	@Mapping(target = "author", source = "author")
	ModerationItemResponse toItem(ModerationCheck check, AppUser author, String targetTitle, boolean hidden);

	@Mapping(target = "checkId", source = "id")
	CommentModerationResponse toCommentModeration(ModerationCheck check);
}
