package com.hackathon.app.service;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Event;
import com.hackathon.app.entity.Registration;
import org.springframework.stereotype.Component;

/**
 * Единственное место правил «можно ли записаться, отменить, управлять, видеть приватные детали».
 * Им пользуются и команды сервисов (бросают исключение с этим же текстом), и блок viewer в карточке.
 * Методы *BlockedReason возвращают текст для человека или null, если действие разрешено.
 */
@Component
public class EventAccessPolicy {

	/** Организатор — автор события. TODO: для события организации — ещё и аккаунт этой организации. */
	public boolean isOrganizer(Event event, UUID userId) {
		return event.getAuthorId().equals(userId);
	}

	/** Управлять (редактировать, решать заявки) можно организатору, пока событие не удалено. Админ не может. */
	public boolean canManage(Event event, UUID userId) {
		return isOrganizer(event, userId) && event.getStatus() != Event.Status.DELETED;
	}

	/** onlineUrl и privateDetails видят организатор и подтверждённые участники. */
	public boolean canSeePrivateDetails(Event event, UUID userId, Registration my) {
		return isOrganizer(event, userId) || (my != null && my.getStatus() == Registration.Status.CONFIRMED);
	}

	/** Админ не создаёт события ни от своего, ни от чужого имени. TODO: ORG — только при Organization.status = APPROVED. */
	public String createBlockedReason(AppUser user) {
		return user.getSystemRole() == AppUser.SystemRole.ADMIN ? "Администратор не создаёт мероприятия" : null;
	}

	public String registerBlockedReason(Event event, UUID userId, Registration my, long confirmed, Instant now) {
		if (event.getStatus() == Event.Status.UNPUBLISHED) {
			return "Запись закрыта: мероприятие снято с публикации";
		}
		if (event.getStatus() == Event.Status.DELETED) {
			return "Запись закрыта: мероприятие удалено";
		}
		if (isOrganizer(event, userId)) {
			return "Организатор не может записаться на своё мероприятие";
		}
		if (!event.getStartAt().isAfter(now)) {
			return "Мероприятие уже началось, запись закрыта";
		}
		if (my != null) {
			switch (my.getStatus()) {
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
		if (event.getCapacity() != null && confirmed >= event.getCapacity()) {
			return "Мест нет";
		}
		return null;
	}

	/** Отменить можно свою подтверждённую запись или заявку до начала мероприятия. Отклонённую — нельзя: иначе отмена + запись обходили бы отказ. */
	public String cancelBlockedReason(Event event, Registration my, Instant now) {
		if (my == null || my.getStatus() == Registration.Status.CANCELLED) {
			return "Вы не записаны на это мероприятие";
		}
		if (my.getStatus() == Registration.Status.REJECTED) {
			return "Заявка отклонена организатором, отменять нечего";
		}
		if (!event.getStartAt().isAfter(now)) {
			return "Мероприятие уже началось, отменить запись нельзя";
		}
		return null;
	}

	/** Подтвердить заявку (в том числе ранее отклонённую по ошибке) можно, пока событие опубликовано и есть места. */
	public String approveBlockedReason(Event event, Registration registration, long confirmed) {
		if (registration.getStatus() == Registration.Status.CANCELLED) {
			return "Участник сам отменил запись";
		}
		if (event.getStatus() != Event.Status.PUBLISHED) {
			return "Мероприятие снято с публикации, подтверждать заявки нельзя";
		}
		if (event.getCapacity() != null && confirmed >= event.getCapacity()) {
			return "Мест нет";
		}
		return null;
	}

	public String rejectBlockedReason(Registration registration) {
		return registration.getStatus() == Registration.Status.CANCELLED ? "Участник сам отменил запись" : null;
	}
}
