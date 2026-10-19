package com.hackathon.app.domain.entity;

import java.util.UUID;

import com.hackathon.app.domain.enums.PetBodyPart;
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
 * Вещь бобра в слоте. Встроенную рисует фронт; добавленная админом хранит свой SVG и посадку на тело.
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
    /**
     * Часть тела своей вещи; у встроенных null.
     */
    @Enumerated(EnumType.STRING)
    private PetBodyPart bodyPart;
    /**
     * Рисунок своей вещи: только <path>, начинается в (0, 0). Готовит pet_item_import.py.
     */
    @Column(length = 400000)
    private String svg;
    /**
     * Сдвиг рисунка по x в координатах рисунка бобра.
     */
    @Column(name = "fit_x")
    private Double fitX;
    /**
     * Сдвиг рисунка по y в координатах рисунка бобра.
     */
    @Column(name = "fit_y")
    private Double fitY;
    /**
     * Масштаб рисунка.
     */
    private Double fitScale;
}
