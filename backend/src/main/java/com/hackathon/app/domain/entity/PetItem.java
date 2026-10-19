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
 * Встроенная вещь бобра в слоте; изображение рисует фронт.
 */
@Entity
@Table(name = "pet_items")
@Getter
@Setter
@NoArgsConstructor
public class PetItem extends AuditEntity {

    /**
     * Идентификатор вещи.
     */
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /**
     * Слот (id).
     */
    private UUID slotId;
    /**
     * Код для API и фронта, уникален в слоте: helmet, hc-sokol... Выпущенные коды не переименовываются.
     */
    private String code;
    /**
     * Подпись для UI.
     */
    private String label;
    /**
     * Встроенная вещь, которую рисует фронт.
     */
    private boolean builtIn;
    /**
     * Порядок в слоте.
     */
    private int position;
}
