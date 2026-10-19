package com.hackathon.app.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Организатор мероприятия: автор или соорганизатор")
public record OrganizerResponse(
		@Schema(description = "Кто", requiredMode = REQUIRED) UserShortResponse user,
		@Schema(description = "Автор мероприятия; его нельзя убрать, только он меняет состав организаторов", requiredMode = REQUIRED)
		boolean author) {
}
