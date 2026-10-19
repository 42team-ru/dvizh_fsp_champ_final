package com.hackathon.app.service;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.OrganizerResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.Event;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.OrganizationMapper;
import com.hackathon.app.domain.mapper.OrganizerMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.EventOrganizerRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.RegistrationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Несколько организаторов у мероприятия, чтобы заявки не висели на одном человеке.
 * Соорганизаторы правят событие и решают заявки наравне с автором; состав меняет только автор, выйти сам может любой соорганизатор.
 */
@Service
@RequiredArgsConstructor
public class EventOrganizerService {

    private final EventRepository events;
    private final OrganizationRepository organizations;
    private final OrganizationMapper organizationMapper;
    private final EventOrganizerRepository organizers;
    private final RegistrationRepository registrations;
    private final NotificationChanges notificationChanges;
    private final AppUserRepository users;
    private final EventAccessPolicy policy;
    private final OrganizerMapper mapper;

    /**
     * Автор первым, дальше соорганизаторы в порядке добавления.
     */
    @Transactional(readOnly = true)
    public List<OrganizerResponse> list(Event event) {
        var coOrganizers = organizers.findByEventIdOrderByCreatedAt(event.getId());
        var organizerIds = new ArrayList<UUID>();
        organizerIds.add(event.getAuthorId());
        coOrganizers.forEach(coOrganizer -> organizerIds.add(coOrganizer.getUserId()));
        var usersById = users.findAllById(organizerIds).stream()
                .collect(Collectors.toMap(AppUser::getId, Function.identity()));
        var organizationByAccount = organizations.findByAccountIdIn(organizerIds).stream()
                .collect(Collectors.toMap(Organization::getAccountId, organizationMapper::toShort));
        var result = new ArrayList<OrganizerResponse>();
        result.add(mapper.toResponse(usersById.get(event.getAuthorId()), true, organizationByAccount.get(event.getAuthorId())));
        coOrganizers.forEach(coOrganizer -> result.add(mapper.toResponse(usersById.get(coOrganizer.getUserId()), false,
                organizationByAccount.get(coOrganizer.getUserId()))));
        return result;
    }

    /**
     * Добавить по логину или email.
     */
    @Transactional
    public List<OrganizerResponse> add(UUID eventId, UUID userId, String login) {
        var event = eventManagedByAuthor(eventId, userId);
        var newOrganizer = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(login.trim(), login.trim())
                .filter(AppUser::isActive)
                .orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        var registration = registrations.findByEventIdAndUserId(eventId, newOrganizer.getId()).orElse(null);
        var blockedReason = policy.addOrganizerBlockedReason(event, newOrganizer, registration);
        if (blockedReason != null) {
            throw new ConflictException(blockedReason);
        }
        try {
            organizers.saveAndFlush(mapper.toEntity(eventId, newOrganizer.getId(), userId));
        } catch (DataIntegrityViolationException _) { // двойной клик: unique(event_id, user_id)
            throw new ConflictException("Пользователь уже организатор этого мероприятия");
        }
        return list(event);
    }

    /**
     * Убрать соорганизатора может автор; соорганизатор может убрать себя сам. Автора убрать нельзя.
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
        var coOrganizer = organizers.findByEventIdAndUserId(eventId, organizerId)
                .orElseThrow(() -> new NoSuchElementException("Этот пользователь не организатор мероприятия"));
        organizers.delete(coOrganizer);
        return list(event);
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
