package com.hackathon.app.service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.PetResponse;
import com.hackathon.app.domain.entity.PetItem;
import com.hackathon.app.domain.entity.PetSlot;
import com.hackathon.app.domain.entity.UserPetEquipment;
import com.hackathon.app.domain.enums.PetSlotKind;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.mapper.PetMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.UserPetEquipmentRepository;
import com.hackathon.app.service.PetCatalogService.Catalog;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Бобр пользователя: что надето, смена образа целиком или по одному слоту.
 * Владелец — всегда из JWT: чужой образ можно только читать. Неверный образ отклоняется целиком (400), ничего не меняя.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PetService {

    private final PetCatalogService catalogService;
    private final UserPetEquipmentRepository equipment;
    private final AppUserRepository users;
    private final PetMapper mapper;

    /**
     * Образ пользователя; без сохранённого — по умолчанию (idle, none, ничего не надето). Нет пользователя — 404.
     */
    @Transactional(readOnly = true)
    public PetResponse get(UUID userId) {
        if (!users.existsById(userId)) {
            throw new NoSuchElementException("Пользователь не найден");
        }
        return toResponse(userId, catalogService.load());
    }

    /**
     * Полная замена: чего нет в outfit — снимается. Сначала проверяется весь образ, потом пишется.
     */
    @Transactional
    public PetResponse save(UUID userId, PetRequest request) {
        var catalog = catalogService.load();
        var chosen = new LinkedHashMap<PetSlot, PetItem>();
        chosen.put(slotOfKind(catalog, PetSlotKind.MOOD), resolve(catalog, PetCatalogService.MOOD, request.mood()));
        chosen.put(slotOfKind(catalog, PetSlotKind.ACTIVITY),
                resolve(catalog, PetCatalogService.ACTIVITY, request.activity()));
        request.outfit().forEach((slotCode, itemCode) -> {
            var slot = catalog.slot(slotCode).filter(s -> s.getKind() == PetSlotKind.OUTFIT)
                    .orElseThrow(() -> new BadRequestException("Неизвестный слот одежды «" + slotCode + "»"));
            if (itemCode != null) { // null — то же, что отсутствие слота: не надето
                chosen.put(slot, resolve(catalog, slotCode, itemCode));
            }
        });
        equipment.deleteByUserId(userId);
        chosen.forEach((slot, item) -> equipment.save(mapper.toEquipment(userId, slot.getId(), item.getId())));
        equipment.flush();
        log.info("Pet saved: userId={}, items={}", userId, chosen.size());
        return toResponse(userId, catalog);
    }

    /**
     * Надеть вещь в один слот или снять (itemCode = null). Снятое настроение — idle, инвентарь — none.
     */
    @Transactional
    public PetResponse equip(UUID userId, String slotCode, String itemCode) {
        var catalog = catalogService.load();
        var slot = catalog.slot(slotCode).orElseThrow(() -> new NoSuchElementException("Слот «" + slotCode + "» не найден"));
        var current = equipment.findByUserIdAndSlotId(userId, slot.getId());
        if (itemCode == null) {
            current.ifPresent(equipment::delete);
        } else {
            var item = resolve(catalog, slotCode, itemCode);
            current.ifPresentOrElse(e -> mapper.equip(e, item.getId()),
                    () -> equipment.save(mapper.toEquipment(userId, slot.getId(), item.getId())));
        }
        equipment.flush();
        return toResponse(userId, catalog);
    }

    /**
     * Вещь из слота; иначе 400 с понятной причиной.
     */
    private static PetItem resolve(Catalog catalog, String slotCode, String itemCode) {
        var slot = catalog.slot(slotCode).orElseThrow(() -> new BadRequestException("Неизвестный слот «" + slotCode + "»"));
        if (itemCode.isBlank() || (slot.getKind() == PetSlotKind.OUTFIT && itemCode.equals(PetCatalogService.NO_ACTIVITY))) {
            throw new BadRequestException("Пустая вещь в слоте «" + slot.getLabel() + "»: чтобы снять, не передавайте слот");
        }
        return catalog.item(slot, itemCode)
                .orElseThrow(() -> new BadRequestException("Нет вещи «" + itemCode + "» в слоте «" + slot.getLabel() + "»"));
    }

    private static PetSlot slotOfKind(Catalog catalog, PetSlotKind kind) {
        return catalog.slots().stream().filter(s -> s.getKind() == kind).findFirst().orElseThrow();
    }

    /**
     * Образ из надетого; удалённые из каталога вещи просто не попадают в ответ.
     */
    private PetResponse toResponse(UUID userId, Catalog catalog) {
        var itemsById = catalog.itemsById();
        Map<UUID, PetItem> equippedBySlot = equipment.findByUserId(userId).stream()
                .filter(e -> itemsById.containsKey(e.getItemId()))
                .collect(Collectors.toMap(UserPetEquipment::getSlotId, e -> itemsById.get(e.getItemId())));
        var mood = PetCatalogService.DEFAULT_MOOD;
        var activity = PetCatalogService.NO_ACTIVITY;
        var outfit = new LinkedHashMap<String, String>();
        for (var slot : catalog.slots()) { // уже по порядку конструктора
            var item = equippedBySlot.get(slot.getId());
            if (item == null) {
                continue;
            }
            switch (slot.getKind()) {
                case MOOD -> mood = item.getCode();
                case ACTIVITY -> activity = item.getCode();
                case OUTFIT -> outfit.put(slot.getCode(), item.getCode());
            }
        }
        return new PetResponse(mood, activity, outfit);
    }
}
