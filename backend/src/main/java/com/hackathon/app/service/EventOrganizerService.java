package com.hackathon.app.service;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.OrganizerInvitationResponse;
import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.entity.OrganizerInvitation;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.OrganizerInviteStatus;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.OrganizationMapper;
import com.hackathon.app.domain.mapper.OrganizerMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.EventOrganizerRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.OrganizerInvitationRepository;
import com.hackathon.app.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Несколько организаторов у мероприятия, чтобы заявки не висели на одном человеке.
 * Соорганизаторы правят событие и решают заявки наравне с автором; состав меняет только автор, выйти сам может любой соорганизатор.
 * Автор не добавляет человека сразу, а приглашает: тот получает уведомление и сам принимает или отказывается.
 */
@Service
@RequiredArgsConstructor
public class EventOrganizerService {

    private static final String ALREADY_INVITED = "Приглашение уже отправлено — ждём ответа";

    private final EventRepository events;
    private final OrganizationRepository organizations;
    private final OrganizationMapper organizationMapper;
    private final EventOrganizerRepository organizers;
    private final OrganizerInvitationRepository invitations;
    private final RegistrationRepository registrations;
    private final NotificationChanges notificationChanges;
    private final AppUserRepository users;
    private final EventAccessPolicy policy;
    private final OrganizerMapper mapper;
    private final DbTimeRepository dbTime;

    /**
     * Состав для карточки: автор первым, дальше соорганизаторы в порядке добавления. Организаторам (viewerId)
     * в конце показываются ещё и приглашённые, которые не ответили (invited = true); остальным — только организаторы.
     */
    @Transactional(readOnly = true)
    public List<OrganizerResponse> list(Event event, UUID viewerId) {
        var coOrganizers = organizers.findByEventIdOrderByCreatedAt(event.getId());
        var invited = viewerId != null && policy.isOrganizer(event, viewerId)
                ? invitations.findByEventIdAndStatusOrderByCreatedAt(event.getId(), OrganizerInviteStatus.PENDING)
                : List.<OrganizerInvitation>of();
        var organizerIds = new ArrayList<UUID>();
        organizerIds.add(event.getAuthorId());
        coOrganizers.forEach(coOrganizer -> organizerIds.add(coOrganizer.getUserId()));
        invited.forEach(invitation -> organizerIds.add(invitation.getUserId()));
        var usersById = users.findAllById(organizerIds).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
        var organizationByAccount = organizations.findByAccountIdIn(organizerIds).stream()
                .collect(Collectors.toMap(Organization::getAccountId, organizationMapper::toShort));
        var result = new ArrayList<OrganizerResponse>();
        result.add(mapper.toResponse(usersById.get(event.getAuthorId()), true, organizationByAccount.get(event.getAuthorId()), false));
        coOrganizers.forEach(coOrganizer -> result.add(mapper.toResponse(usersById.get(coOrganizer.getUserId()), false,
                organizationByAccount.get(coOrganizer.getUserId()), false)));
        invited.forEach(invitation -> result.add(mapper.toResponse(usersById.get(invitation.getUserId()), false,
                organizationByAccount.get(invitation.getUserId()), true)));
        return result;
    }

    /**
     * Пригласить по логину или email: человек получит уведомление и сам решит. Повторное приглашение после отказа
     * или отзыва переиспользует строку; пока ждём ответа — 409.
     */
    @Transactional
    public List<OrganizerResponse> add(UUID eventId, UUID userId, String login) {
        var event = eventManagedByAuthor(eventId, userId);
        var invitee = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(login.trim(), login.trim())
                .filter(AppUser::isActive)
                .orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        var registration = registrations.findByEventIdAndUserId(eventId, invitee.getId()).orElse(null);
        var blockedReason = policy.addOrganizerBlockedReason(event, invitee, registration);
        if (blockedReason != null) {
            throw new ConflictException(blockedReason);
        }
        var existing = invitations.findByEventIdAndUserId(eventId, invitee.getId()).orElse(null);
        if (existing == null) {
            try {
                invitations.saveAndFlush(mapper.toInvitation(eventId, invitee.getId(), userId));
            } catch (DataIntegrityViolationException _) { // двойной клик: unique(event_id, user_id)
                throw new ConflictException(ALREADY_INVITED);
            }
        } else if (existing.getStatus() == OrganizerInviteStatus.PENDING) {
            throw new ConflictException(ALREADY_INVITED);
        } else {
            mapper.reinvite(existing, userId);
        }
        return list(event, userId);
    }

    /**
     * Мои приглашения, которые ждут ответа: новые сверху, без удалённых мероприятий.
     */
    @Transactional(readOnly = true)
    public List<OrganizerInvitationResponse> myInvitations(UUID userId) {
        var pending = invitations.findByUserIdAndStatusOrderByUpdatedAtDesc(userId, OrganizerInviteStatus.PENDING);
        var eventsById = events.findAllById(pending.stream().map(OrganizerInvitation::getEventId).toList()).stream()
                .collect(Collectors.toMap(Event::getId, Function.identity()));
        var usersById = users.findAllById(pending.stream().map(OrganizerInvitation::getInvitedById).toList()).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity(), (a, b) -> a));
        return pending.stream()
                .filter(invitation -> eventsById.containsKey(invitation.getEventId())
                        && eventsById.get(invitation.getEventId()).getStatus() != EventStatus.DELETED)
                .map(invitation -> mapper.toInvitationResponse(invitation, eventsById.get(invitation.getEventId()),
                        usersById.get(invitation.getInvitedById())))
                .toList();
    }

    /** Ждёт ли пользователь ответа на приглашение в организаторы этого мероприятия (для блока viewer). */
    @Transactional(readOnly = true)
    public boolean isInvited(UUID eventId, UUID userId) {
        return invitations.findByEventIdAndUserId(eventId, userId)
                .map(invitation -> invitation.getStatus() == OrganizerInviteStatus.PENDING)
                .orElse(false);
    }

    /**
     * Принять приглашение: становлюсь соорганизатором. Правила те же, что при приглашении (за это время
     * мог записаться участником или мероприятие удалили). Возвращает оставшиеся приглашения.
     */
    @Transactional
    public List<OrganizerInvitationResponse> accept(UUID eventId, UUID userId) {
        var event = events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        notificationChanges.watch(eventId, userId);
        var invitation = pendingInvitation(eventId, userId);
        if (!policy.canManageOrganizers(event, event.getAuthorId())) {
            throw new ConflictException(policy.manageConflictReason(event, "Мероприятие удалено, стать организатором нельзя"));
        }
        var me = users.findById(userId).orElseThrow();
        var registration = registrations.findByEventIdAndUserId(eventId, userId).orElse(null);
        if (policy.addOrganizerBlockedReason(event, me, registration) != null) {
            throw new ConflictException(policy.isOrganizer(event, userId)
                    ? "Вы уже организатор этого мероприятия"
                    : "Вы записаны участником: сначала отмените запись, потом примите приглашение");
        }
        organizers.saveAndFlush(mapper.toEntity(eventId, userId, invitation.getInvitedById()));
        mapper.decide(invitation, OrganizerInviteStatus.ACCEPTED, dbTime.now());
        return myInvitations(userId);
    }

    /**
     * Отказаться от приглашения: автор получит уведомление. Возвращает оставшиеся приглашения.
     */
    @Transactional
    public List<OrganizerInvitationResponse> decline(UUID eventId, UUID userId) {
        events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        notificationChanges.watch(eventId, userId);
        mapper.decide(pendingInvitation(eventId, userId), OrganizerInviteStatus.DECLINED, dbTime.now());
        return myInvitations(userId);
    }

    /**
     * Убрать соорганизатора может автор; соорганизатор может убрать себя сам. Автора убрать нельзя.
     * Если человек ещё только приглашён, автор этим же вызовом отзывает приглашение.
     */
    @Transactional
    public List<OrganizerResponse> remove(UUID eventId, UUID userId, UUID organizerId) {
        var event = events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        notificationChanges.watch(eventId, userId);
        if (policy.isAuthor(event, organizerId)) {
            throw new ConflictException("Автора мероприятия убрать из организаторов нельзя");
        }
        boolean leavingMyself = userId.equals(organizerId);
        if (!leavingMyself) {
            eventManagedByAuthor(eventId, userId);
        }
        var coOrganizer = organizers.findByEventIdAndUserId(eventId, organizerId).orElse(null);
        if (coOrganizer != null) {
            organizers.delete(coOrganizer);
            return list(event, userId);
        }
        var invitation = leavingMyself ? null : invitations.findByEventIdAndUserId(eventId, organizerId)
                .filter(pending -> pending.getStatus() == OrganizerInviteStatus.PENDING)
                .orElse(null);
        if (invitation == null) {
            throw new NoSuchElementException("Этот пользователь не организатор мероприятия");
        }
        mapper.decide(invitation, OrganizerInviteStatus.CANCELLED, dbTime.now());
        return list(event, userId);
    }

    private OrganizerInvitation pendingInvitation(UUID eventId, UUID userId) {
        return invitations.findByEventIdAndUserId(eventId, userId)
                .filter(invitation -> invitation.getStatus() == OrganizerInviteStatus.PENDING)
                .orElseThrow(() -> new NoSuchElementException("Приглашения нет: его отозвали или вы уже ответили"));
    }

    /**
     * Менять состав может только автор и только пока событие не удалено.
     */
    private Event eventManagedByAuthor(UUID eventId, UUID userId) {
        var event = events.findByIdForUpdate(eventId).orElseThrow(() -> new NoSuchElementException(EventService.NOT_FOUND));
        notificationChanges.watch(eventId, userId);
        if (!policy.isAuthor(event, userId)) {
            throw new ForbiddenException("Состав организаторов меняет только автор мероприятия");
        }
        if (!policy.canManageOrganizers(event, userId)) {
            throw new ConflictException(policy.manageConflictReason(event, "Мероприятие удалено, менять организаторов нельзя"));
        }
        return event;
    }
}
