package com.hackathon.app.service;

import com.hackathon.app.domain.entity.AppUser;

/** Результат входа/обновления: пользователь + токены, которые слой rest положит в cookie. */
public record AuthSession(AppUser user, String accessToken, String refreshToken) {
}
