package com.hackathon.app.service;

import java.time.DayOfWeek;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import com.hackathon.app.domain.dto.HelpersPreferences;
import com.hackathon.app.domain.dto.SaveUserPreferencesRequest;
import com.hackathon.app.domain.dto.UserPreferencesResponse;
import com.hackathon.app.domain.entity.UserPreferences;
import com.hackathon.app.domain.enums.Daytime;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.domain.mapper.UserPreferencesMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.UserPreferencesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Хранение предпочтений; подбор событий и уровни UserSport не меняются. */
@Service
@RequiredArgsConstructor
public class UserPreferencesService {
    private final UserPreferencesRepository preferences;
    private final AppUserRepository users;
    private final UserPreferencesMapper mapper;

    @Transactional(readOnly = true)
    public UserPreferencesResponse get(UUID userId) {
        if (!users.existsById(userId)) {
            throw new NoSuchElementException("Пользователь не найден");
        }
        return preferences.findByUserId(userId).map(mapper::toResponse).orElseGet(() ->
                new UserPreferencesResponse(SportLevel.AMATEUR,
                        List.of(DayOfWeek.TUESDAY, DayOfWeek.THURSDAY, DayOfWeek.SATURDAY),
                        Daytime.EVENING, 5, new HelpersPreferences(true, true, false)));
    }

    @Transactional
    public UserPreferencesResponse save(UUID userId, SaveUserPreferencesRequest request) {
        // Блокируем владельца, чтобы одновременное первое сохранение не создало две строки.
        users.findByIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        var saved = preferences.findByUserId(userId).orElseGet(UserPreferences::new);
        mapper.update(saved, userId, request);
        return mapper.toResponse(preferences.saveAndFlush(saved));
    }
}
