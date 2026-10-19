package com.hackathon.app.dto;

import com.hackathon.app.entity.Registration;

/**
 * Что текущий пользователь может делать с мероприятием. Считает EventAccessPolicy; фронт рисует кнопки только по этому блоку.
 * registerBlockedReason — почему нельзя записаться (текст для человека), null — можно.
 */
public record ViewerResponse(
		Registration.Status registrationStatus,
		boolean canRegister,
		String registerBlockedReason,
		boolean isOrganizer,
		boolean canManage,
		boolean canCancel,
		boolean canSeePrivateDetails) {
}
