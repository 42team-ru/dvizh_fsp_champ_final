package com.hackathon.app.domain.entity;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** До четырёх личных образов из принадлежащих владельцу вещей. */
@Entity
@Table(name = "pet_saved_looks")
@Getter
@Setter
@NoArgsConstructor
public class PetSavedLook extends AuditEntity {
    /** Идентификатор образа. */
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    /** Владелец образа. */
    @Column(nullable = false)
    private UUID userId;
    /** Название, выбранное владельцем. */
    @Column(nullable = false, length = 30)
    private String name;
    /** Инвентарь или none. */
    @Column(nullable = false, length = 100)
    private String activity;
    /** Коды одежды и фона по слотам. */
    @ElementCollection
    @CollectionTable(name = "pet_saved_look_outfit", joinColumns = @JoinColumn(name = "look_id"))
    @MapKeyColumn(name = "slot_code", length = 100)
    @Column(name = "item_code", nullable = false, length = 100)
    private Map<String, String> outfit = new LinkedHashMap<>();
}
