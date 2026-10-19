package com.hackathon.app.domain.mapper;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AdminOrganizationResponse;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.OrganizationAccountResponse;
import com.hackathon.app.domain.dto.OrganizationResponse;
import com.hackathon.app.domain.dto.OrganizationShortResponse;
import com.hackathon.app.domain.dto.PublicOrganizationResponse;
import com.hackathon.app.domain.dto.SaveOrganizationRequest;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Organization;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/**
 * Контакты из анкеты сервис кладёт сам, после проверки формата, поэтому здесь они пропущены.
 * Документы (файлы) сервис передаёт готовым списком, логотип — ссылкой по logoFileId.
 */
@Mapper(config = MappingConfig.class, uses = FileMapper.class)
public interface OrganizationMapper {

	@Mapping(target = "contacts", ignore = true)
	Organization toEntity(SaveOrganizationRequest request, UUID accountId);

	@Mapping(target = "contacts", ignore = true)
	void update(@MappingTarget Organization organization, SaveOrganizationRequest request);

	@Mapping(target = "logoUrl", source = "organization.logoFileId", qualifiedByName = "fileUrl")
	OrganizationResponse toResponse(Organization organization, List<FileResponse> documents);

	@Mapping(target = "logoUrl", source = "organization.logoFileId", qualifiedByName = "fileUrl")
	PublicOrganizationResponse toPublic(Organization organization, List<FileResponse> documents);

	OrganizationShortResponse toShort(Organization organization);

	@Mapping(target = "id", source = "organization.id")
	@Mapping(target = "city", source = "organization.city")
	@Mapping(target = "createdAt", source = "organization.createdAt")
	@Mapping(target = "updatedAt", source = "organization.updatedAt")
	@Mapping(target = "account", source = "account")
	@Mapping(target = "logoUrl", source = "organization.logoFileId", qualifiedByName = "fileUrl")
	AdminOrganizationResponse toAdmin(Organization organization, AppUser account, List<FileResponse> documents);

	OrganizationAccountResponse toAccount(AppUser user);
}
