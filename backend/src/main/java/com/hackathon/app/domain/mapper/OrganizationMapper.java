package com.hackathon.app.domain.mapper;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AdminOrganizationResponse;
import com.hackathon.app.domain.dto.AwardBadgeResponse;
import com.hackathon.app.domain.dto.FeaturedOrganizationResponse;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.OrganizationAccountResponse;
import com.hackathon.app.domain.dto.OrganizationResponse;
import com.hackathon.app.domain.dto.OrganizationShortResponse;
import com.hackathon.app.domain.dto.PublicOrganizationResponse;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.enums.OrganizationStatus;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/**
 * Контакты из анкеты сервис кладёт сам, после проверки формата, поэтому здесь они пропущены.
 * Документы (файлы) сервис передаёт готовым списком, логотип — ссылкой по logoFileId.
 */
@Mapper(config = MappingConfig.class, uses = FileMapper.class)
public interface OrganizationMapper {

	/** Первая анкета: статус и время подачи выбирает сервис. */
	@Mapping(target = "contacts", ignore = true)
	Organization toEntity(SaveOrganizationRequest request, UUID accountId, OrganizationStatus status, Instant submittedAt);

	@Mapping(target = "contacts", ignore = true)
	void update(@MappingTarget Organization organization, SaveOrganizationRequest request);

	/** Правка после отказа: заявка снова уходит на проверку. */
	void resubmit(@MappingTarget Organization organization, OrganizationStatus status, Instant submittedAt);

	/** Решение админа: статус, причина отказа (null при одобрении), когда и кто. */
	void decide(@MappingTarget Organization organization, OrganizationStatus status, String rejectReason,
			Instant reviewedAt, UUID reviewedById);

	@Mapping(target = "logoUrl", source = "organization.logoFileId", qualifiedByName = "fileUrl")
	OrganizationResponse toResponse(Organization organization, List<FileResponse> documents, List<SportResponse> sports);

	@Mapping(target = "logoUrl", source = "organization.logoFileId", qualifiedByName = "fileUrl")
	PublicOrganizationResponse toPublic(Organization organization, List<FileResponse> documents,
			List<AwardBadgeResponse> awards, List<SportResponse> sports, long hostedMeetings, long participantsTotal);

	/** Организация месяца для ленты. */
	@Mapping(target = "logoUrl", source = "organization.logoFileId", qualifiedByName = "fileUrl")
	FeaturedOrganizationResponse toFeatured(Organization organization, LocalDate period);

	/** Служебный код особой организации; через API не задаётся. */
	void assignCode(@MappingTarget Organization organization, String code);

	OrganizationShortResponse toShort(Organization organization);

	@Mapping(target = "id", source = "organization.id")
	@Mapping(target = "city", source = "organization.city")
	@Mapping(target = "createdAt", source = "organization.createdAt")
	@Mapping(target = "updatedAt", source = "organization.updatedAt")
	@Mapping(target = "account", source = "account")
	@Mapping(target = "logoUrl", source = "organization.logoFileId", qualifiedByName = "fileUrl")
	AdminOrganizationResponse toAdmin(Organization organization, AppUser account, List<FileResponse> documents,
			List<SportResponse> sports, long eventsCount);

	/** Логотип организации: новый файл или null — убрать (сгенерированный метод null пропустил бы, поэтому вручную). */
	default void logo(@MappingTarget Organization organization, UUID logoFileId) {
		organization.setLogoFileId(logoFileId);
	}

	OrganizationAccountResponse toAccount(AppUser user);
}
