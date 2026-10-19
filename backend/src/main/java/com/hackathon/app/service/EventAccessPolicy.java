package com.hackathon.app.service;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.repository.EventOrganizerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Единственное место правил «можно ли записаться, отменить, управлять, видеть приватные детали».
 * Им пользуются и команды сервисов (бросают исключение с этим же текстом), и блок viewer в карточке.
 * Методы *BlockedReason возвращают текст для человека или null, если действие разрешено.
 */
@Component
@RequiredArgsConstructor
public class EventAccessPolicy {

	private final EventOrganizerRepository organizers;

	/** Автор — владелец мероприятия: только он меняет состав организаторов. */
	public boolean isAuthor(Event event, UUID userId) {
		return event.getAuthorId().equals(userId);
	}

	/** Организатор — автор или соорганизатор. TODO: для события организации — ещё и аккаунт этой организации. */
	public boolean isOrganizer(Event event, UUID userId) {
		return isAuthor(event, userId) || organizers.existsByEventIdAndUserId(event.getId(), userId);
	}

	/** Добавлять и убирать соорганизаторов может только автор, пока событие не удалено. */
	public boolean canManageOrganizers(Event event, UUID userId) {
		return isAuthor(event, userId) && event.getStatus() != EventStatus.DELETED;
	}

	/**
	 * Кого можно сделать соорганизатором. Админ не может (он не решает заявки, правило 7);
	 * записанный участник — сначала пусть отменит запись, иначе он займёт место и будет решать свою же заявку.
	 */
	public String addOrganizerBlockedReason(Event event, AppUser user, Registration registration) {
		if (isOrganizer(event, user.getId())) {
			return "Пользователь уже организатор этого мероприятия";
		}
		if (user.getSystemRole() == SystemRole.ADMIN) {
			return "Администратора нельзя сделать организатором";
		}
		if (registration != null && (registration.getStatus() == RegistrationStatus.CONFIRMED
				|| registration.getStatus() == RegistrationStatus.PENDING)) {
			return "Пользователь записан участником: пусть сначала отменит запись";
		}
		return null;
	}

	/** Управлять (редактировать, решать заявки) можно организатору, пока событие не удалено. Админ не может. */
	public boolean canManage(Event event, UUID userId) {
		return isOrganizer(event, userId) && event.getStatus() != EventStatus.DELETED;
	}

	/** onlineUrl и privateDetails видят организатор и подтверждённые участники. */
	public boolean canSeePrivateDetails(Event event, UUID userId, Registration myRegistration) {
		return isOrganizer(event, userId) || (myRegistration != null && myRegistration.getStatus() == RegistrationStatus.CONFIRMED);
	}

	/**
	 * Админ не создаёт события ни от своего, ни от чужого имени. Аккаунт организации публикует
	 * только после одобрения заявки; organization — его анкета (null, если ещё не заполнена).
	 */
	public String createBlockedReason(AppUser user, Organization organization) {
		return switch (user.getSystemRole()) {
			case ADMIN -> "Администратор не создаёт мероприятия";
			case ORG -> organization == null || organization.getStatus() != OrganizationStatus.APPROVED
					? "Публиковать мероприятия от организации можно только после одобрения заявки"
					: null;
			case USER -> null;
		};
	}

	public String registerBlockedReason(Event event, UUID userId, Registration myRegistration, long confirmedCount, Instant now) {
		if (event.getStatus() == EventStatus.UNPUBLISHED) {
			return "Запись закрыта: мероприятие снято с публикации";
		}
		if (event.getStatus() == EventStatus.DELETED) {
			return "Запись закрыта: мероприятие удалено";
		}
		if (isOrganizer(event, userId)) {
			return "Организатор не может записаться на своё мероприятие";
		}
		if (!event.getStartAt().isAfter(now)) {
			return "Мероприятие уже началось, запись закрыта";
		}
		if (myRegistration != null) {
			switch (myRegistration.getStatus()) {
				case CONFIRMED -> {
					return "Вы уже записаны на это мероприятие";
				}
				case PENDING -> {
					return "Заявка уже отправлена и ждёт решения организатора";
				}
				// повторно подать нельзя (иначе отказ ничего не значит); ошибку исправляет организатор через approve
				case REJECTED -> {
					return "Организатор отклонил вашу заявку. Если это ошибка, свяжитесь с организатором";
				}
				case CANCELLED -> {
				} // после отмены можно записаться снова
			}
		}
		if (event.getCapacity() != null && confirmedCount >= event.getCapacity()) {
			return "Мест нет";
		}
		return null;
	}

	/** Отменить можно свою подтверждённую запись или заявку до начала мероприятия. Отклонённую — нельзя: иначе отмена + запись обходили бы отказ. */
	public String cancelBlockedReason(Event event, Registration myRegistration, Instant now) {
		if (myRegistration == null || myRegistration.getStatus() == RegistrationStatus.CANCELLED) {
			return "Вы не записаны на это мероприятие";
		}
		if (myRegistration.getStatus() == RegistrationStatus.REJECTED) {
			return "Заявка отклонена организатором, отменять нечего";
		}
		if (!event.getStartAt().isAfter(now)) {
			return "Мероприятие уже началось, отменить запись нельзя";
		}
		return null;
	}

	/** Подтвердить заявку (в том числе ранее отклонённую по ошибке) можно, пока событие опубликовано и есть места. */
	public String approveBlockedReason(Event event, Registration registration, long confirmedCount) {
		if (registration.getStatus() == RegistrationStatus.CANCELLED) {
			return "Участник сам отменил запись";
		}
		if (event.getStatus() != EventStatus.PUBLISHED) {
			return "Мероприятие снято с публикации, подтверждать заявки нельзя";
		}
		if (event.getCapacity() != null && confirmedCount >= event.getCapacity()) {
			return "Мест нет";
		}
		return null;
	}

	public String rejectBlockedReason(Registration registration) {
		return registration.getStatus() == RegistrationStatus.CANCELLED ? "Участник сам отменил запись" : null;
	}
}
