package com.hackathon.app.service;

import java.util.NoSuchElementException;
import java.util.UUID;

import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.repository.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Единое разрешение публичной ссылки на активного пользователя по UUID или логину. */
@Service
public class UserRefService {
    private final AppUserRepository users;

    public UserRefService(AppUserRepository users) {
        this.users = users;
    }

    /** UUID сохраняет совместимость старых ссылок; логин сравнивается без учёта регистра. */
    @Transactional(readOnly = true)
    public UUID resolveUserRef(String ref) {
        UUID id;
        try {
            id = UUID.fromString(ref);
        } catch (IllegalArgumentException ignored) {
            return users.findByUsernameIgnoreCase(ref).filter(AppUser::isActive)
                    .orElseThrow(() -> new NoSuchElementException("Пользователь не найден")).getId();
        }
        return users.findById(id).filter(AppUser::isActive)
                .orElseThrow(() -> new NoSuchElementException("Пользователь не найден")).getId();
    }
}
