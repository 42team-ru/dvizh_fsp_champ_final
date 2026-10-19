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
                event.getTitle() + "\n" + preview(reply.getText()), "/events/" + event.getId(), event.getId(), null, null, null)));
    }

    /** Новое сообщение в общем потоке — организаторам, чтобы вопрос не остался без ответа. Свой вопрос публикатор пропустит. */
    public void question(Event event, Comment comment, Set<UUID> organizerIds) {
        publisher.publish(List.of(new NotificationFact("question:" + comment.getId(), Set.copyOf(organizerIds),
                comment.getAuthorId(), NotificationType.COMMENT_CREATED, NotificationCategory.DISCUSSIONS,
                "Новый вопрос в обсуждении", event.getTitle() + "\n" + preview(comment.getText()),
                "/events/" + event.getId(), event.getId(), null, null, null)));
    }

    /** Админ скрыл сообщение — автор узнаёт, где и почему. */
    public void hidden(Event event, Comment comment, UUID adminId) {
        publisher.publish(List.of(new NotificationFact("hidden:" + comment.getId() + ":" + comment.getHiddenAt(),
                Set.of(comment.getAuthorId()), adminId, NotificationType.COMMENT_HIDDEN, NotificationCategory.DISCUSSIONS,
                "Ваше сообщение скрыто модератором", event.getTitle() + "\nПричина: " + comment.getHideReason(),
                "/events/" + event.getId(), event.getId(), null, null, null)));
    }

    /** Объявление организатора — участникам, ожидающим решения и листу ожидания. */
    public void announcement(Event event, Set<UUID> recipients, UUID actorId) {
        publisher.publish(List.of(new NotificationFact("announcement:" + event.getId() + ":" + event.getAnnouncedAt(),
                recipients, actorId, NotificationType.EVENT_ANNOUNCEMENT, NotificationCategory.EVENTS,
                "Объявление организатора", event.getTitle() + "\n" + event.getAnnouncement(),
                "/events/" + event.getId(), event.getId(), null, null, null)));
    }

    private static String preview(String text) {
        return text.length() <= 200 ? text : text.substring(0, 200).stripTrailing() + "…";
    }

    public void submitted(Organization organization) {
        var admins = users.findBySystemRoleAndActiveTrue(SystemRole.ADMIN).stream().map(AppUser::getId).collect(Collectors.toSet());
        publish(organization, organization.getAccountId(), NotificationType.ORGANIZATION_SUBMITTED, admins,
                "Новая заявка организации", null, "/admin/organizations/" + organization.getId());
    }

    public void decided(Organization organization, UUID adminId) {
        var type = switch (organization.getStatus()) {
            case APPROVED -> NotificationType.ORGANIZATION_APPROVED;
            case REVISION -> NotificationType.ORGANIZATION_RETURNED;
            default -> NotificationType.ORGANIZATION_REJECTED;
        };
        var title = switch (type) {
            case ORGANIZATION_APPROVED -> "Организация одобрена";
            case ORGANIZATION_RETURNED -> "Анкету вернули на доработку";
            default -> "Организация отклонена";
        };
        publish(organization, adminId, type, Set.of(organization.getAccountId()), title, organization.getRejectReason(), "/org");
    }

    private void publish(Organization organization, UUID actorId, NotificationType type, Set<UUID> recipients,
                         String title, String detail, String path) {
        publisher.publish(List.of(new NotificationFact(UUID.randomUUID() + ":" + type, recipients, actorId, type,
                NotificationCategory.ORGANIZATIONS, title, organization.getName() + (detail == null ? "" : "\n" + detail),
                path, null, null, organization.getId(), null)));
    }
}
