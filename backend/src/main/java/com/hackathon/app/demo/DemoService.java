package com.hackathon.app.demo;

import java.util.List;

import com.hackathon.app.repository.AppUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Демо-режим: тестовые аккаунты (их создаёт {@link DemoSeeder}) с общим паролем, а фронт показывает их кнопками и
 * подставляет логин/пароль в обычную форму входа (отдельной логики входа нет).
 * Работает ТОЛЬКО при app.demo.enabled=true; иначе список пуст.
 * Не включать на «боевом» окружении с реальными пользователями: пароль демо-аккаунтов публичен.
 */
@Service
@RequiredArgsConstructor
public class DemoService {

	private final DemoProperties props;
	private final AppUserRepository users;

	/** Кнопки быстрого входа: основные роли и персонажи сценариев, без массовки. */
	@Transactional(readOnly = true)
	public List<DemoAccountResponse> accounts() {
		if (!props.enabled()) {
			return List.of();
		}
		return DemoSeeder.ACCOUNTS.stream()
				.filter(DemoSeeder.Account::onLoginPage)
				.map(a -> users.findByUsernameIgnoreCaseOrEmailIgnoreCase(a.username(), a.email()).orElse(null))
				.filter(u -> u != null && u.isActive())
				.map(u -> DemoAccountResponse.of(u, props.password()))
				.toList();
	}
}
