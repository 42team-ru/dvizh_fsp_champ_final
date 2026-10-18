package com.hackathon.app.service;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.config.DemoProperties;
import com.hackathon.app.dto.DemoAccountResponse;
import com.hackathon.app.entity.AppUser;
import com.hackathon.app.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;

/**
 * Демо-режим: при старте создаются тестовые аккаунты с общим паролем, а фронт показывает их кнопками и подставляет
 * логин/пароль в обычную форму входа (отдельной логики входа нет).
 * Работает ТОЛЬКО при app.demo.enabled=true; иначе список пуст.
 * Не включать на «боевом» окружении с реальными пользователями: пароль демо-аккаунтов публичен.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DemoService {

	private record Spec(String username, String email, String firstName, String lastName, AppUser.SystemRole role) {
	}

	private static final List<Spec> ACCOUNTS = List.of(
			new Spec("admin", "admin@demo.local", "Анна", "Админова", AppUser.SystemRole.ADMIN),
			new Spec("ivan", "ivan@demo.local", "Иван", "Петров", AppUser.SystemRole.USER),
			new Spec("maria", "maria@demo.local", "Мария", "Сидорова", AppUser.SystemRole.USER));

	private final DemoProperties props;
	private final AppUserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final Clock clock;

	/** Идемпотентно: существующие аккаунты не трогаем, недостающие создаём. */
	@EventListener(ApplicationReadyEvent.class)
	@Transactional
	public void seed() {
		if (!props.enabled()) {
			return;
		}
		log.warn("ДЕМО-РЕЖИМ включён: доступен вход без пароля в тестовые аккаунты. Не использовать с реальными данными.");
		for (var spec : ACCOUNTS) {
			if (users.existsByUsernameIgnoreCase(spec.username())) {
				continue;
			}
			var u = new AppUser();
			u.setId(UUID.randomUUID());
			u.setUsername(spec.username());
			u.setEmail(spec.email());
			u.setPasswordHash(passwordEncoder.encode(props.password()));
			u.setFirstName(spec.firstName());
			u.setLastName(spec.lastName());
			u.setActive(true);
			u.setSystemRole(spec.role());
			u.setAuthProvider(AppUser.AuthProvider.LOCAL);
			u.setCreatedAt(clock.instant());
			users.save(u);
		}
	}

	@Transactional(readOnly = true)
	public List<DemoAccountResponse> accounts() {
		if (!props.enabled()) {
			return List.of();
		}
		return ACCOUNTS.stream()
				.map(s -> users.findByUsernameIgnoreCaseOrEmailIgnoreCase(s.username(), s.email()).orElse(null))
				.filter(u -> u != null && u.isActive())
				.map(u -> DemoAccountResponse.of(u, props.password()))
				.toList();
	}
}
