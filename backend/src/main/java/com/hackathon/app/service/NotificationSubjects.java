package com.hackathon.app.service;

import java.util.*;
import java.util.stream.Collectors;
import com.hackathon.app.domain.entity.*;
import com.hackathon.app.domain.enums.*;
import com.hackathon.app.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Поводы, не требующие сравнения состояния всего мероприятия. */
@Service
@RequiredArgsConstructor
public class NotificationSubjects {
    private final NotificationPublisher publisher;
    private final AppUserRepository users;

    public void reply(Event event, Comment reply, UUID parentAuthorId) {
        publisher.publish(List.of(new NotificationFact("reply:" + reply.getId(), Set.of(parentAuthorId), reply.getAuthorId(),
                NotificationType.COMMENT_REPLY, NotificationCategory.DISCUSSIONS, "Вам ответили в обсуждении",
                event.getTitle(), "/events/" + event.getId(), event.getId(), null, null, null)));
    }

    public void submitted(Organization organization) {
        var admins = users.findBySystemRoleAndActiveTrue(SystemRole.ADMIN).stream().map(AppUser::getId).collect(Collectors.toSet());
        publish(organization, organization.getAccountId(), NotificationType.ORGANIZATION_SUBMITTED, admins,
                "Новая заявка организации", null, "/admin/organizations/" + organization.getId());
    }

    public void decided(Organization organization, UUID adminId) {
        boolean approved = organization.getStatus() == OrganizationStatus.APPROVED;
        publish(organization, adminId, approved ? NotificationType.ORGANIZATION_APPROVED : NotificationType.ORGANIZATION_REJECTED,
                Set.of(organization.getAccountId()), approved ? "Организация одобрена" : "Организация отклонена",
                organization.getRejectReason(), "/org");
    }

    private void publish(Organization organization, UUID actorId, NotificationType type, Set<UUID> recipients,
                         String title, String detail, String path) {
        publisher.publish(List.of(new NotificationFact(UUID.randomUUID() + ":" + type, recipients, actorId, type,
                NotificationCategory.ORGANIZATIONS, title, organization.getName() + (detail == null ? "" : "\n" + detail),
                path, null, null, organization.getId(), null)));
    }
}
