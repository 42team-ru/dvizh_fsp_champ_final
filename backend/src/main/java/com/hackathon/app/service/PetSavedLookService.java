package com.hackathon.app.service;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Objects;
import java.util.NoSuchElementException;
import java.util.UUID;
import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.PetSaveLookRequest;
import com.hackathon.app.domain.dto.PetSavedLookResponse;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.PetMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.PetSavedLookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Сохранение своих образов, лимит защищён блокировкой владельца. */
@Service
@RequiredArgsConstructor
public class PetSavedLookService {
    /** Образы владельца. */
    private final PetSavedLookRepository looks;
    /** Блокировка лимита. */
    private final AppUserRepository users;
    /** Проверка вещей без изменения текущего образа. */
    private final PetService pets;
    /** Актуальные слоты и вещи. */
    private final PetCatalogService catalog;
    /** Проверка личного аккаунта. */
    private final WalletService wallet;
    /** Заполнение сущности и ответа. */
    private final PetMapper mapper;

    @Transactional(readOnly = true)
    public List<PetSavedLookResponse> list(UUID userId) {
        wallet.requireUserAccount(userId);
        return looks.findByUserIdOrderByCreatedAtAsc(userId).stream().map(mapper::toSavedLookResponse).toList();
    }

    @Transactional
    public PetSavedLookResponse save(UUID userId, PetSaveLookRequest request) {
        wallet.requireUserAccount(userId);
        users.findByIdForUpdate(userId).orElseThrow();
        var snapshot = catalog.load();
        pets.checkedLook(userId, snapshot, new PetRequest(request.activity(), request.outfit()));
        if (looks.countByUserId(userId) >= 4) {
            throw new ConflictException("Можно сохранить не больше 4 образов");
        }
        var outfit = new LinkedHashMap<>(request.outfit());
        outfit.values().removeIf(Objects::isNull);
        return mapper.toSavedLookResponse(looks.save(mapper.toSavedLook(userId, request.name(), request.activity(), outfit)));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        wallet.requireUserAccount(userId);
        looks.delete(looks.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Образ не найден")));
    }
}
