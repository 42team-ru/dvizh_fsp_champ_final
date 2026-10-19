package com.hackathon.app.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Справочник видов спорта: новый вид добавляется строкой в БД, а не изменением кода. */
@Entity
@Table(name = "sports")
@Getter
@Setter
@NoArgsConstructor
public class Sport {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	private String code;
	private String name;
}
