package com.hackathon.app.domain.entity;

import java.util.UUID;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;

/** Подписка человека на анонсы организации. */
@Entity
@Table(name = "organization_subscriptions")
@Getter
@Setter
@NoArgsConstructor
public class OrganizationSubscription extends AuditEntity {
    /** Идентификатор подписки. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Организация, чьи анонсы интересны человеку. */
    private UUID organizationId;
    /** Подписчик с ролью USER. */
    private UUID userId;
}
