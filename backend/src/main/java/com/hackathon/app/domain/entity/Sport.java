package com.hackathon.app.domain.entity;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.SportStatus;

import jakarta.persistence.Column;
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
 * Справочник видов спорта: новый вид добавляется строкой в БД (в том числе пользователем), а не изменением кода.
 */
@Entity
@Table(name = "sports")
@Getter
@Setter
@NoArgsConstructor
public class Sport extends AuditEntity {

    /**
     * Идентификатор вида спорта.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /**
     * Название для отображения, например «Футбол».
     */
    private String name;
    /**
     * Название для поиска и защиты от дублей: без лишних пробелов, нижний регистр, ё → е.
     */
    private String normalizedName;
    /**
     * Код для URL, например football.
     */
    private String slug;
    /**
     * Добавлен пользователем, а не из исходного справочника.
     */
    private boolean custom;
    /**
     * Кто добавил свой вид (id пользователя); null — из справочника.
     */
    private UUID createdById;
    /**
     * Состояние в справочнике: у видов из исходного набора ACTIVE, у своих до решения админа PENDING.
     */
    @Enumerated(EnumType.STRING)
    private SportStatus catalogStatus = SportStatus.ACTIVE;
    /**
     * Причина отключения или слияния; видна админу.
     */
    private String decisionReason;
    /**
     * Вид, с которым этот объединён; только у MERGED.
     */
    private UUID mergedIntoId;
    /**
     * Когда админ принял решение по виду.
     */
    private Instant decidedAt;
    /**
     * Кто из админов принял решение.
     */
    private UUID decidedById;
    /**
     * Загруженная PNG-картинка (id файла); null — используется иллюстрация из classpath или общая.
     */
    private UUID imageFileId;
    /**
     * Точка фокуса загруженной картинки по горизонтали, % ширины; null — не задана.
     */
    @Column(name = "image_focus_x")
    private Double imageFocusX;
    /**
     * Точка фокуса загруженной картинки по вертикали, % высоты; null — не задана.
     */
    @Column(name = "image_focus_y")
    private Double imageFocusY;
}
