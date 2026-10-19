package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.dto.AdminSportResponse;
import com.hackathon.app.domain.dto.FocusPoint;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.dto.UserShortResponse;
import com.hackathon.app.domain.entity.OrganizationSport;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.SportStatus;
import com.hackathon.app.util.SportImages;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = MappingConfig.class, imports = SportImages.class)
public interface SportMapper {

	@Mapping(target = "imageUrl", expression = "java(imageUrl(sport))")
	@Mapping(target = "imageFocus", expression = "java(imageFocus(sport))")
	SportResponse toResponse(Sport sport);

	/** Свой вид спорта, который пользователь ввёл в форме мероприятия: ждёт проверки админа. */
	@Mapping(target = "custom", constant = "true")
	@Mapping(target = "catalogStatus", constant = "PENDING")
	Sport toCustom(String name, String normalizedName, String slug, UUID createdById);

	/** Вид спорта, который админ добавил в справочник сам. */
	@Mapping(target = "custom", constant = "false")
	Sport toCatalog(String name, String normalizedName, String slug, SportStatus catalogStatus, UUID createdById);

	/** Вид спорта в анкете организации. */
	OrganizationSport toOrganizationSport(UUID organizationId, UUID sportId);

	/** Вид в админке: свой файл — только настоящая картинка (загруженная или из classpath), не заглушка. */
	@Mapping(target = "id", source = "sport.id")
	@Mapping(target = "name", source = "sport.name")
	@Mapping(target = "slug", source = "sport.slug")
	@Mapping(target = "custom", source = "sport.custom")
	@Mapping(target = "status", source = "sport.catalogStatus")
	@Mapping(target = "moderationReason", source = "sport.decisionReason")
	@Mapping(target = "moderatedAt", source = "sport.decidedAt")
	@Mapping(target = "createdAt", source = "sport.createdAt")
	@Mapping(target = "hasImage", expression = "java(hasImage(sport))")
	@Mapping(target = "imageUploaded", expression = "java(sport.getImageFileId() != null)")
	@Mapping(target = "imageUrl", expression = "java(hasImage(sport) ? imageUrl(sport) : null)")
	@Mapping(target = "imageFocus", expression = "java(imageFocus(sport))")
	AdminSportResponse toAdmin(Sport sport, long eventsCount, UserShortResponse proposedBy, String mergedIntoName);

	/** Решение админа: новый статус, причина и слияние. */
	default void moderate(@MappingTarget Sport sport, SportStatus status, String reason, UUID mergedIntoId, Instant at,
			UUID adminId) {
		sport.setCatalogStatus(status);
		sport.setDecisionReason(reason);
		sport.setMergedIntoId(mergedIntoId);
		sport.setDecidedAt(at);
		sport.setDecidedById(adminId);
	}

	/** Новое название: нормализованный ключ ищется по нему. */
	default void rename(@MappingTarget Sport sport, String name, String normalizedName) {
		sport.setName(name);
		sport.setNormalizedName(normalizedName);
	}

	/** Загруженная картинка вида и её точка фокуса; null — вернуться к иллюстрации из classpath. */
	default void image(@MappingTarget Sport sport, UUID fileId, FocusPoint focus) {
		sport.setImageFileId(fileId);
		sport.setImageFocusX(fileId == null || focus == null ? null : focus.x());
		sport.setImageFocusY(fileId == null || focus == null ? null : focus.y());
	}

	/** Картинка вида: загруженный файл, иначе иллюстрация из classpath или общая. */
	default String imageUrl(Sport sport) {
		return sport.getImageFileId() == null ? SportImages.url(sport.getSlug()) : "/api/files/" + sport.getImageFileId();
	}

	/** Точка фокуса: у загруженной картинки — заданная админом, у остальных — замеренная. */
	default FocusPoint imageFocus(Sport sport) {
		if (sport.getImageFileId() == null) {
			return SportImages.focus(sport.getSlug());
		}
		return sport.getImageFocusX() == null || sport.getImageFocusY() == null
				? SportImages.focus(null)
				: new FocusPoint(sport.getImageFocusX(), sport.getImageFocusY());
	}

	/** Есть ли у вида своя картинка, а не общая заглушка. */
	default boolean hasImage(Sport sport) {
		return sport.getImageFileId() != null || SportImages.hasOwn(sport.getSlug());
	}
}
