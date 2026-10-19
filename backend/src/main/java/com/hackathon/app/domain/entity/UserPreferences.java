package com.hackathon.app.domain.entity;

import java.time.DayOfWeek;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.domain.enums.Daytime;
import com.hackathon.app.domain.enums.SportLevel;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Личные предпочтения онбординга, независимо от уровней отдельных видов спорта. */
@Entity
@Table(name = "user_preferences")
@Getter
@Setter
@NoArgsConstructor
public class UserPreferences extends AuditEntity {
    /** Идентификатор настроек. */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Владелец настроек. */
    @Column(nullable = false)
    private UUID userId;
    /** Общий уровень подготовки. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SportLevel level;
    /** Удобные дни недели. */
    @ElementCollection
    @CollectionTable(name = "user_preference_days", joinColumns = @JoinColumn(name = "preferences_id"))
    @Column(name = "day_of_week", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private Set<DayOfWeek> days = new HashSet<>();
    /** Предпочтительное время суток. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Daytime daytime;
    /** Радиус поиска в километрах. */
    @Column(nullable = false)
    private int radiusKm;
    /** Напоминать о тренировках. */
    @Column(nullable = false)
    private boolean reminders;
    /** Подсказывать события рядом. */
    @Column(nullable = false)
    private boolean nearby;
    /** Радоваться достижениям. */
    @Column(nullable = false)
    private boolean cheer;
    /** Широта домашней точки для подбора «рядом с домом»; null — не задана (тогда и долгота null). */
    private Double homeLat;
    /** Долгота домашней точки; null — не задана. */
    private Double homeLon;
}
