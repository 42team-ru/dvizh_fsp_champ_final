package com.hackathon.app.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.hackathon.app.entity.Registration;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Что текущий пользователь может делать с мероприятием. Считает EventAccessPolicy; фронт рисует кнопки только по этому блоку.
 */
@Schema(description = "Права текущего пользователя на мероприятие: фронт рисует кнопки только по этому блоку")
public record ViewerResponse(
		@Schema(description = "Статус моей записи; null — не записан")
		Registration.Status registrationStatus,
		@Schema(description = "Можно ли записаться", requiredMode = REQUIRED)
		boolean canRegister,
		@Schema(description = "Почему нельзя записаться, текст для человека; null — можно", example = "Мест нет")
		String registerBlockedReason,
		// имя в JSON фиксируем явно: у boolean с префиксом is Jackson и springdoc могут вывести «organizer»
		@JsonProperty("isOrganizer")
		@Schema(description = "Я организатор", requiredMode = REQUIRED)
		boolean isOrganizer,
		@Schema(description = "Могу редактировать и решать заявки", requiredMode = REQUIRED)
		boolean canManage,
		@Schema(description = "Могу отменить свою запись", requiredMode = REQUIRED)
		boolean canCancel,
		@Schema(description = "Вижу onlineUrl и privateDetails", requiredMode = REQUIRED)
		boolean canSeePrivateDetails) {
}
