package com.hackathon.app.service;

import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;
import com.hackathon.app.domain.dto.OrganizationSubscriptionResponse;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.OrganizationSubscriptionMapper;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.repository.OrganizationSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OrganizationSubscriptionService {
    private final OrganizationRepository organizations;
    private final OrganizationSubscriptionRepository subscriptions;
    private final AppUserRepository users;
    private final OrganizationSubscriptionMapper mapper;
    private final UserMapper userMapper;

    /** Блокировка организации сериализует повторные POST/DELETE и защищает уникальную пару. */
    @Transactional
    public OrganizationSubscriptionResponse change(UUID organizationId, UUID userId, boolean subscribe) {
        var org = organizations.findByIdForUpdate(organizationId)
                .filter(o -> o.getStatus() == OrganizationStatus.APPROVED)
                .orElseThrow(() -> new NoSuchElementException(OrganizationService.NOT_FOUND));
        var user = users.findById(userId).orElseThrow();
        if (user.getSystemRole() != SystemRole.USER) {
            throw new ConflictException("Подписываться на организации может только участник с личным аккаунтом");
        }
        var existing = subscriptions.findByOrganizationIdAndUserId(org.getId(), userId);
        if (subscribe && existing.isEmpty()) subscriptions.saveAndFlush(mapper.toEntity(organizationId, userId));
        if (!subscribe && existing.isPresent()) {
            subscriptions.delete(existing.get());
            subscriptions.flush();
        }
        return state(organizationId, userId);
    }

    @Transactional(readOnly = true)
    public OrganizationSubscriptionResponse state(UUID organizationId, UUID userId) {
        var ids = subscriptions.subscriberIds(organizationId, PageRequest.of(0, 4));
        var byId = users.findAllById(ids).stream().collect(Collectors.toMap(u -> u.getId(), userMapper::toShort));
        return new OrganizationSubscriptionResponse(
                subscriptions.findByOrganizationIdAndUserId(organizationId, userId).isPresent(),
                subscriptions.countByOrganizationId(organizationId), ids.stream().map(byId::get).toList());
    }
}
