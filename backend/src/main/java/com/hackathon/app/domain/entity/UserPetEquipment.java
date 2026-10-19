package com.hackathon.app.domain.entity;

import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Что надето на бобре пользователя в одном слоте. Одна строка на пару (пользователь, слот).
 */
@Entity
@Table(name = "user_pet_equipment")
@Getter
@Setter
@NoArgsConstructor
public class UserPetEquipment extends AuditEntity {

    /**
     * Идентификатор записи.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /**
     * Владелец бобра (id пользователя).
     */
    private UUID userId;
    /**
     * Слот (id).
     */
    private UUID slotId;
    /**
     * Надетая вещь (id).
     */
    private UUID itemId;
}
