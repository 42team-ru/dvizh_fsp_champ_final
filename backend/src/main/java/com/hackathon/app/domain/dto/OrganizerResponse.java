package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Организатор мероприятия: автор, соорганизатор или приглашённый в соорганизаторы (invited)")
public record OrganizerResponse(
		@Schema(description = "Кто", requiredMode = REQUIRED) UserShortResponse user,
		@Schema(description = "Автор мероприятия; его нельзя убрать, только он меняет состав организаторов", requiredMode = REQUIRED)
		boolean author,
		@Schema(description = "Организация, если это её аккаунт: показывать её название вместо контактного лица; иначе null")
		OrganizationShortResponse organization,
		@Schema(description = "Только приглашён и ещё не ответил: прав организатора пока нет. Такие строки видят только организаторы",
				requiredMode = REQUIRED)
		boolean invited) {
}
