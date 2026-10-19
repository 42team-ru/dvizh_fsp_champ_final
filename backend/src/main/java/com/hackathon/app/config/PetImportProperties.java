package com.hackathon.app.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Импорт своих вещей бобра: какой Python запускать (с vtracer, pillow, svgelements) и сколько ждать разбора.
 * В Docker-образе это venv /opt/pet-import, локально — свой интерпретатор (docs/beaver-pet.md).
 */
@ConfigurationProperties("app.pet-import")
public record PetImportProperties(String python, Duration timeout) {
}
