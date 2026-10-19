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
 * Вещь бобра в слоте. Встроенную рисует фронт; добавленную админом — картинка в S3 (imageFileId).
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
     * Картинка в S3 (files); null — встроенная, её рисует фронт.
     */
    private UUID imageFileId;
    /**
     * Встроенная (рисует фронт); удалить можно только не встроенную.
     */
    private boolean builtIn;
    /**
     * Порядок в слоте.
     */
    private int position;
}
