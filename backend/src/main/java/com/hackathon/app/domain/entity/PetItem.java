package com.hackathon.app.domain.entity;

import java.util.UUID;

import com.hackathon.app.domain.enums.PetItemKind;
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
    /**
     * Цена в монетах; 0 у базовых и эксклюзивных.
     */
    private int price;
    /**
     * Как получить: базовая, магазин или эксклюзив.
     */
    @Enumerated(EnumType.STRING)
    private PetItemKind kind = PetItemKind.SHOP;
    /**
     * Продолжение фразы «Дают …» у эксклюзива, например «за 10 встреч»; у остальных null.
     */
    private String unlockHint;
}
