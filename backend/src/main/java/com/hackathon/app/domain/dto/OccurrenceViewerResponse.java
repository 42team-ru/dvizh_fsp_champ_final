package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;

/** Что текущий пользователь может делать с занятием. Считает EventAccessPolicy; фронт рисует кнопки только по нему. */
@Schema(description = "Мои права на занятие: фронт рисует кнопки только по этому блоку")
public record OccurrenceViewerResponse(
		@Schema(description = "Я приду: отметился на занятие (у разового — подтверждённая запись)", requiredMode = REQUIRED)
		boolean attending,
		@Schema(description = "Можно отметиться «приду»", requiredMode = REQUIRED) boolean canAttend,
		@Schema(description = "Почему нельзя отметиться; null — можно", example = "Мест нет")
		String attendBlockedReason,
		@Schema(description = "Можно снять отметку", requiredMode = REQUIRED) boolean canUnattend,
		@Schema(description = "Могу отменить занятие (организатор; у разового — всё мероприятие)", requiredMode = REQUIRED)
		boolean canCancel,
		@Schema(description = "Могу перенести занятие (организатор серии)", requiredMode = REQUIRED)
		boolean canReschedule,
		@Schema(description = "Могу подтвердить «Состоится» (организатор, у мероприятия есть кворум)", requiredMode = REQUIRED)
		boolean canConfirm) {
}
