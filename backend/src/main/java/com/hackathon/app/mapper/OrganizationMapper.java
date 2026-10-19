package com.hackathon.app.mapper;

import java.util.UUID;

import com.hackathon.app.dto.AdminOrganizationResponse;
import com.hackathon.app.dto.OrganizationAccountResponse;
import com.hackathon.app.dto.OrganizationResponse;
import com.hackathon.app.dto.PublicOrganizationResponse;
import com.hackathon.app.dto.SaveOrganizationRequest;
import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Organization;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

/** Контакты из анкеты сервис кладёт сам, после проверки формата, поэтому здесь они пропущены. */
@Mapper(config = MappingConfig.class)
public interface OrganizationMapper {

	@Mapping(target = "contacts", ignore = true)
	Organization toEntity(SaveOrganizationRequest request, UUID accountId);

	@Mapping(target = "contacts", ignore = true)
	void update(@MappingTarget Organization organization, SaveOrganizationRequest request);

	OrganizationResponse toResponse(Organization organization);

	PublicOrganizationResponse toPublic(Organization organization);

	@Mapping(target = "id", source = "organization.id")
	@Mapping(target = "city", source = "organization.city")
	@Mapping(target = "createdAt", source = "organization.createdAt")
	@Mapping(target = "updatedAt", source = "organization.updatedAt")
	@Mapping(target = "account", source = "account")
	AdminOrganizationResponse toAdmin(Organization organization, AppUser account);

	OrganizationAccountResponse toAccount(AppUser user);
}
