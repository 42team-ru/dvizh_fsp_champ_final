package com.hackathon.app.domain.entity;

import java.util.UUID;

import com.hackathon.app.domain.enums.PetSlotKind;
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
 * Слот бобра: настроение, инвентарь или часть одежды. В слоте надет максимум один предмет.
 */
@Entity
@Table(name = "pet_slots")
@Getter
@Setter
@NoArgsConstructor
public class PetSlot extends AuditEntity {

    /**
     * Идентификатор слота.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /**
     * Код для API и фронта: mood, activity, hat, eyewear... Не меняется после создания.
     */
    private String code;
    /**
     * Подпись для UI, например «Головной убор».
     */
    private String label;
    /**
     * Тип: настроение, инвентарь или одежда.
     */
    @Enumerated(EnumType.STRING)
    private PetSlotKind kind;
    /**
     * Порядок в конструкторе.
     */
    private int position;
    /**
     * Встроенный слот (рисует фронт); админ добавляет только не встроенные.
     */
    private boolean builtIn;
}
