package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventKind;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.EventStatus;
import com.hackathon.app.domain.enums.JoinMode;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Мероприятие — центр модели: вид спорта, место, время и режим записи — его атрибуты.
 */
@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
public class Event extends AuditEntity {

    /**
     * Идентификатор мероприятия.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /**
     * Название.
     */
    private String title;
    /**
     * Описание.
     */
    private String description;
    /**
     * Вид спорта (id из справочника sports).
     */
    private UUID sportId;
    /**
     * Кто создал мероприятие (id пользователя).
     */
    private UUID authorId;
    /**
     * Организация, от имени которой мероприятие; null — от частного лица.
     */
    private UUID organizationId;
    /**
     * Время начала.
     */
    private Instant startAt;
    /**
     * Время окончания; null — не указано.
     */
    private Instant endAt;
    /**
     * Формат проведения: очно или онлайн.
     */
    @Enumerated(EnumType.STRING)
    private EventFormat format;
    /**
     * Адрес; обязателен для очного.
     */
    private String address;
    /**
     * Текстовое описание места.
     */
    private String locationNote;
    /**
     * Ссылка на онлайн-встречу; видят только подтверждённые участники и организатор.
     */
    private String onlineUrl;
    /**
     * Широта точки на карте.
     */
    private Double lat;
    /**
     * Долгота точки на карте.
     */
    private Double lon;
    /**
     * Для какого уровня подготовки.
     */
    @Enumerated(EnumType.STRING)
    private EventLevel level;
    /**
     * Вид мероприятия.
     */
    @Enumerated(EnumType.STRING)
    private EventKind kind;
    /**
     * Требования к участникам.
     */
    private String requirements;
    /**
     * Что взять с собой (инвентарь, форма).
     */
    private String equipment;
    /**
     * Лимит мест; null — без лимита.
     */
    private Integer capacity;
    /**
     * Режим записи.
     */
    @Enumerated(EnumType.STRING)
    private JoinMode joinMode;
    /**
     * Детали только для участников (точное место, ссылка на чат).
     */
    private String privateDetails;
    /**
     * Статус мероприятия.
     */
    @Enumerated(EnumType.STRING)
    private EventStatus status;
    /**
     * Причина снятия с публикации или удаления.
     */
    private String moderationReason;
    /**
     * Когда промодерировано.
     */
    private Instant moderatedAt;
    /**
     * Кто промодерировал (id пользователя).
     */
    private UUID moderatedById;
}
