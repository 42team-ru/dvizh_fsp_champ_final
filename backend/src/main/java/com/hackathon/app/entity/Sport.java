package com.hackathon.app.entity;

import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Справочник видов спорта: новый вид добавляется строкой в БД (в том числе пользователем), а не изменением кода. */
@Entity
@Table(name = "sports")
@Getter
@Setter
@NoArgsConstructor
public class Sport extends AuditEntity {

	/** Идентификатор вида спорта. */
	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;
	/** Название для отображения, например «Футбол». */
	private String name;
	/** Название для поиска и защиты от дублей: без лишних пробелов, нижний регистр, ё → е. */
	private String normalizedName;
	/** Код для URL, например football. */
	private String slug;
	/** Добавлен пользователем, а не из исходного справочника. */
	private boolean custom;
	/** Кто добавил свой вид (id пользователя); null — из справочника. */
	private UUID createdById;
}
