package com.hackathon.app.service;

import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.repository.UserPetEquipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Готовые встроенные образы; существующий выбор пользователя не меняется. */
@Service
@RequiredArgsConstructor
public class DemoPetSeeder {
    /** Сохранение образов. */
    private final PetService pets;
    /** Проверка существующего образа. */
    private final UserPetEquipmentRepository equipment;

    @Transactional
    public void seed(Map<String, UUID> userIds) {
        look(userIds.get("anna"), new PetRequest("juggle", Map.of("shirt", "yenisey", "hat", "cap")));
        look(userIds.get("petr"), new PetRequest("chess", Map.of("shirt", "training", "neck", "medal")));
        look(userIds.get("olga"), new PetRequest("lift", Map.of("shirt", "training", "neck", "whistle", "hat", "headband")));
    }

    private void look(UUID userId, PetRequest request) {
        if (equipment.findByUserId(userId).isEmpty()) {
            pets.save(userId, request);
        }
    }
}
