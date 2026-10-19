package com.hackathon.app.service;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.EventOccurrence;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.Registration;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.OccurrenceStatus;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.QuorumStatus;
import com.hackathon.app.domain.enums.RegistrationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.repository.EventOccurrenceRepository;
import com.hackathon.app.repository.EventOrganizerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Единственное место правил «можно ли записаться, отменить, управлять, видеть приватные детали».
 * Им пользуются и команды сервисов (бросают исключение с этим же текстом), и блок viewer в карточке.
 * Методы *BlockedReason возвращают текст для человека или null, если действие разрешено.
 * <p>
 * Серия (recurring): запись — это вступление в серию, лимита мест на вступление нет; дальше участник сам отмечается
 * на занятия, и лимит мест считается по отметкам каждого занятия. «Уже началось» у серии — когда не осталось
 * ни одного будущего занятия, которое состоится.
 */
@Component
@RequiredArgsConstructor
public class EventAccessPolicy {

	private final EventOrganizerRepository organizers;
	private final EventOccurrenceRepository occurrences;

	/** Автор — владелец мероприятия: только он меняет состав организаторов. */
	public boolean isAuthor(Event event, UUID userId) {
		return event.getAuthorId().equals(userId);
	}

	/** Организатор — автор или соорганизатор. Событие организации создаёт её аккаунт, поэтому он и есть автор. */
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

	/**
	 * До какого момента открыта запись: у разового — его начало, у серии — начало ближайшего будущего занятия,
	 * которое состоится (null — таких нет).
	 */
	public Instant upcomingStart(Event event, Instant now) {
		if (!event.isRecurring()) {
			return event.getStartAt();
		}
		return occurrences.findFirstByEventIdAndStatusAndStartAtAfterOrderByStartAt(event.getId(),
				OccurrenceStatus.SCHEDULED, now).map(EventOccurrence::getStartAt).orElse(null);
	}

	/** confirmedCount нужен только разовому: у серии лимит мест — на занятие, а не на вступление. */
	public String registerBlockedReason(Event event, UUID userId, Registration myRegistration, long confirmedCount, Instant now) {
		if (event.getStatus() == EventStatus.UNPUBLISHED) {
			return "Запись закрыта: мероприятие снято с публикации";
		}
		if (event.getStatus() == EventStatus.DELETED) {
			return "Запись закрыта: мероприятие удалено";
		}
		if (isSingleCancelled(event)) {
			return "Запись закрыта: организатор отменил мероприятие";
		}
		if (isOrganizer(event, userId)) {
			return "Организатор не может записаться на своё мероприятие";
		}
		var upcomingStart = upcomingStart(event, now);
		if (upcomingStart == null || !upcomingStart.isAfter(now)) {
			return event.isRecurring() ? "Все занятия серии уже прошли, запись закрыта"
					: "Мероприятие уже началось, запись закрыта";
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
		if (!event.isRecurring() && event.getCapacity() != null && confirmedCount >= event.getCapacity()) {
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
		var upcomingStart = upcomingStart(event, now);
		if (upcomingStart == null || !upcomingStart.isAfter(now)) {
			return event.isRecurring() ? "Все занятия серии уже прошли, выходить не из чего"
					: "Мероприятие уже началось, отменить запись нельзя";
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
		if (isSingleCancelled(event)) {
			return "Мероприятие отменено организатором, подтверждать заявки нельзя";
		}
		if (!event.isRecurring() && event.getCapacity() != null && confirmedCount >= event.getCapacity()) {
			return "Мест нет";
		}
		return null;
	}

	public String rejectBlockedReason(Registration registration) {
		return registration.getStatus() == RegistrationStatus.CANCELLED ? "Участник сам отменил запись" : null;
	}

	/** Писать в обсуждение может любой вошедший, даже не записанный; у удалённого мероприятия обсуждение закрыто. */
	public String commentBlockedReason(Event event) {
		return event.getStatus() == EventStatus.DELETED ? "Мероприятие удалено, обсуждение закрыто" : null;
	}

	/** Все организаторы мероприятия одним запросом: автор и соорганизаторы. Для меток «Организатор» в обсуждении. */
	public Set<UUID> organizerIds(Event event) {
		var ids = new HashSet<UUID>();
		ids.add(event.getAuthorId());
		organizers.findByEventIdOrderByCreatedAt(event.getId()).forEach(organizer -> ids.add(organizer.getUserId()));
		return ids;
	}

	/** Админ снимает с публикации только опубликованное: удалённое вернуть нельзя. */
	public String unpublishBlockedReason(Event event) {
		return event.getStatus() == EventStatus.DELETED ? "Мероприятие удалено, снимать нечего" : null;
	}

	/**
	 * Отметка «приду» на занятие серии: только принятому в серию, до начала занятия, пока есть места на это занятие.
	 * attending — я уже отмечен; attendeesCount — сколько отметок у занятия сейчас.
	 */
	public String attendBlockedReason(Event event, EventOccurrence occurrence, UUID userId, Registration myRegistration,
			boolean attending, long attendeesCount, Instant now) {
		if (!event.isRecurring()) {
			return "На разовое мероприятие отмечаться не нужно: достаточно записи";
		}
		if (event.getStatus() == EventStatus.UNPUBLISHED) {
			return "Мероприятие снято с публикации, отмечаться нельзя";
		}
		if (event.getStatus() == EventStatus.DELETED) {
			return "Мероприятие удалено, отмечаться нельзя";
		}
		if (attending) {
			return "Вы уже отметились на это занятие";
		}
		if (occurrence.getStatus() == OccurrenceStatus.CANCELLED) {
			return "Занятие отменено";
		}
		if (!occurrence.getStartAt().isAfter(now)) {
			return "Занятие уже началось";
		}
		if (isOrganizer(event, userId)) {
			return "Организатор не отмечается на занятия своей серии";
		}
		if (myRegistration == null || myRegistration.getStatus() != RegistrationStatus.CONFIRMED) {
			return myRegistration != null && myRegistration.getStatus() == RegistrationStatus.PENDING
					? "Заявка в серию ещё ждёт решения организатора"
					: "Чтобы отмечаться на занятия, сначала запишитесь в серию";
		}
		if (event.getCapacity() != null && attendeesCount >= event.getCapacity()) {
			return "Мест нет";
		}
		return null;
	}

	/** Снять отметку можно до начала занятия; на отменённом занятии отметки остаются как были. */
	public String unattendBlockedReason(Event event, EventOccurrence occurrence, boolean attending, Instant now) {
		if (!event.isRecurring()) {
			return "Чтобы не прийти на разовое мероприятие, отмените запись";
		}
		if (!attending) {
			return "Вы не отмечены на это занятие";
		}
		if (occurrence.getStatus() == OccurrenceStatus.CANCELLED) {
			return "Занятие отменено";
		}
		if (!occurrence.getStartAt().isAfter(now)) {
			return "Занятие уже началось, отметку не снять";
		}
		return null;
	}

	/**
	 * Переносить занятия и добавлять даты может организатор серии, пока она не удалена.
	 * Проверять после isOrganizer: не организатор — это 403, а причины отсюда — 409.
	 */
	public String manageOccurrencesBlockedReason(Event event) {
		if (!event.isRecurring()) {
			return "Занятия меняются только у повторяющегося мероприятия; время разового правится в самом мероприятии";
		}
		if (event.getStatus() == EventStatus.DELETED) {
			return "Мероприятие удалено, менять занятия нельзя";
		}
		return null;
	}

	/** Отменить или перенести можно только будущее занятие, которое ещё состоится. */
	public String changeOccurrenceBlockedReason(EventOccurrence occurrence, Instant now) {
		if (occurrence.getStatus() == OccurrenceStatus.CANCELLED) {
			return "Занятие уже отменено";
		}
		if (!occurrence.getStartAt().isAfter(now)) {
			return "Занятие уже началось, менять его нельзя";
		}
		return null;
	}

	/** Разовое мероприятие, единственное занятие которого организатор отменил: записи нет, в ленте его нет. */
	public boolean isSingleCancelled(Event event) {
		return !event.isRecurring()
				&& occurrences.existsByEventIdAndStatus(event.getId(), OccurrenceStatus.CANCELLED);
	}

	/**
	 * Отменить можно будущее занятие серии или разовое мероприятие целиком (его единственное занятие), пока
	 * мероприятие не удалено. Проверять после isOrganizer: не организатор — это 403.
	 */
	public String cancelOccurrenceBlockedReason(Event event, EventOccurrence occurrence, Instant now) {
		if (event.getStatus() == EventStatus.DELETED) {
			return "Мероприятие удалено, отменять нечего";
		}
		return changeOccurrenceBlockedReason(occurrence, now);
	}

	/**
	 * Кворум занятия: null — у мероприятия его нет. Подтверждение организатора не снимается,
	 * даже если потом кто-то откажется. count — отметки (у разового — подтверждённые записи).
	 */
	public QuorumStatus quorumStatus(Event event, EventOccurrence occurrence, long count) {
		if (event.getMinParticipants() == null) {
			return null;
		}
		if (occurrence.getConfirmedAt() != null) {
			return QuorumStatus.CONFIRMED;
		}
		return count >= event.getMinParticipants() ? QuorumStatus.REACHED : QuorumStatus.GATHERING;
	}

	/**
	 * «Состоится»: организатор подтверждает занятие, в том числе пока кворум не набран.
	 * Уже подтверждённое здесь не запрещено: повторное нажатие — не ошибка, а кнопку прячет canConfirmOccurrence.
	 * Проверять после isOrganizer: не организатор — это 403.
	 */
	public String confirmOccurrenceBlockedReason(Event event, EventOccurrence occurrence, Instant now) {
		if (event.getMinParticipants() == null) {
			return "У мероприятия не задан кворум, подтверждать нечего";
		}
		if (event.getStatus() == EventStatus.DELETED) {
			return "Мероприятие удалено";
		}
		if (event.getStatus() == EventStatus.UNPUBLISHED) {
			return "Мероприятие снято с публикации";
		}
		if (occurrence.getStatus() == OccurrenceStatus.CANCELLED) {
			return "Занятие отменено";
		}
		if (!occurrence.getStartAt().isAfter(now)) {
			return "Занятие уже началось";
		}
		return null;
	}

	/** Кнопка «Отменить» у занятия. */
	public boolean canCancelOccurrence(Event event, EventOccurrence occurrence, UUID userId, Instant now) {
		return isOrganizer(event, userId) && cancelOccurrenceBlockedReason(event, occurrence, now) == null;
	}

	/** Кнопка «Перенести»: только у серии. */
	public boolean canRescheduleOccurrence(Event event, EventOccurrence occurrence, UUID userId, Instant now) {
		return isOrganizer(event, userId) && manageOccurrencesBlockedReason(event) == null
				&& changeOccurrenceBlockedReason(occurrence, now) == null;
	}

	/** Кнопка «Подтвердить: состоится». */
	public boolean canConfirmOccurrence(Event event, EventOccurrence occurrence, UUID userId, Instant now) {
		return occurrence.getConfirmedAt() == null && isOrganizer(event, userId)
				&& confirmOccurrenceBlockedReason(event, occurrence, now) == null;
	}
}
