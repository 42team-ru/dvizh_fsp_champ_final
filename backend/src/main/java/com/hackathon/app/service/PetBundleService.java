package com.hackathon.app.service;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.PetBuySetRequest;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.dto.PetResponse;
import com.hackathon.app.domain.dto.ShopBundleResponse;
import com.hackathon.app.domain.dto.ShopItemResponse;
import com.hackathon.app.domain.enums.LedgerKind;
import com.hackathon.app.domain.enums.PetItemKind;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.EconomyMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.UserItemRepository;
import com.hackathon.app.service.PetCatalogService.Bundle;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Персональные цены комплектов и атомарная покупка с полной заменой образа. */
@Service
@RequiredArgsConstructor
public class PetBundleService {
    /** Каталог вещей и готовых образов. */
    private final PetCatalogService catalog;
    /** Магазин с признаками владения вещами. */
    private final ShopService shop;
    /** Сохранение полного образа с проверкой владения. */
    private final PetService pets;
    /** Блокировка покупателя. */
    private final AppUserRepository users;
    /** Купленные вещи пользователя. */
    private final UserItemRepository userItems;
    /** Единственное место списания монет. */
    private final WalletService wallet;
    /** Создание строк инвентаря. */
    private final EconomyMapper mapper;
    /** Время операции из базы. */
    private final DbTimeRepository time;

    /** Комплекты с ценой только недостающих вещей; пустой инвентарь не входит в счётчик. */
    @Transactional(readOnly = true)
    public List<ShopBundleResponse> bundles(UUID userId) {
        var items = shop.shop(userId);
        return PetCatalogService.BUNDLES.stream().map(bundle -> response(bundle, items)).toList();
    }

    /** Блокировка, проверки, одно списание, все вещи и надевание — одна транзакция. */
    @Transactional
    public PetResponse buy(UUID userId, String code) {
        wallet.requireUserAccount(userId);
        var bundle = PetCatalogService.BUNDLES.stream().filter(b -> b.code().equals(code)).findFirst()
                .orElseThrow(() -> new NoSuchElementException("Комплект «" + code + "» не найден"));
        users.findByIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
        var response = response(bundle, shop.shop(userId));
        if (response.locked()) {
            throw new ConflictException(response.lockedReason());
        }
        var snapshot = catalog.load();
        var owned = userItems.findByUserId(userId).stream().map(item -> item.getItemId())
                .collect(Collectors.toSet());
        var missing = catalog.bundleItems(snapshot, bundle).stream()
                .filter(item -> item.getKind() != PetItemKind.BASE && !owned.contains(item.getId())).toList();
        if (!missing.isEmpty()) {
            var fingerprint = missing.stream().map(item -> item.getId().toString()).sorted()
                    .collect(Collectors.joining(","));
            var key = "BUNDLE:" + userId + ":" + code + ":"
                    + UUID.nameUUIDFromBytes(fingerprint.getBytes(StandardCharsets.UTF_8));
            wallet.apply(userId, -response.price(), LedgerKind.PURCHASE, key,
                    "Покупка комплекта: " + bundle.label(), null, null, time.now());
            missing.forEach(item -> userItems.save(mapper.toUserItem(userId, item.getId())));
        }
        return pets.save(userId, new PetRequest(bundle.activity(), bundle.outfit()));
    }

    /** Купить только недостающее одним списанием и при желании добавить к надетому. */
    @Transactional
    public PetResponse buySet(UUID userId, PetBuySetRequest request) {
        wallet.requireUserAccount(userId);
        var user = users.findByIdForUpdate(userId).orElseThrow();
        var available = shop.shop(userId).stream().collect(Collectors.toMap(ShopItemResponse::id, item -> item));
        var wanted = request.items().stream().distinct().map(id -> {
            var item = available.get(id);
            if (item == null) throw new NoSuchElementException("Вещь «" + id + "» не найдена");
            if (item.kind() == PetItemKind.EXCLUSIVE) throw new ConflictException("Эту вещь нельзя купить — " + item.hint());
            return item;
        }).toList();
        if (wanted.stream().map(ShopItemResponse::slot).distinct().count() != wanted.size()) {
            throw new BadRequestException("Выберите одну вещь для каждого слота");
        }
        var missing = wanted.stream().filter(item -> !item.owned()).toList();
        var total = missing.stream().mapToInt(ShopItemResponse::price).sum();
        var price = missing.size() >= 2 ? total * 80 / 100 : total;
        if (user.getCoins() < price) throw new ConflictException("Не хватает " + (price - user.getCoins()) + " монет");
        if (!missing.isEmpty()) {
            var fingerprint = missing.stream().map(ShopItemResponse::id).sorted().collect(Collectors.joining(","));
            var key = "SET:" + userId + ":" + UUID.nameUUIDFromBytes(fingerprint.getBytes(StandardCharsets.UTF_8));
            wallet.apply(userId, -price, LedgerKind.PURCHASE, key, "Покупка примеренных вещей", null, null, time.now());
            var snapshot = catalog.load();
            missing.forEach(item -> userItems.save(mapper.toUserItem(userId,
                    snapshot.item(snapshot.slot(item.slot()).orElseThrow(), item.code()).orElseThrow().getId())));
        }
        var current = pets.get(userId);
        if (!request.wear()) return current;
        var outfit = new LinkedHashMap<>(current.outfit());
        var activity = current.activity();
        for (var item : wanted) {
            if (item.slot().equals(PetCatalogService.ACTIVITY)) activity = item.code();
            else outfit.put(item.slot(), item.code());
        }
        return pets.save(userId, new PetRequest(activity, outfit));
    }

    private static ShopBundleResponse response(Bundle bundle, List<ShopItemResponse> shop) {
        var items = shop.stream().filter(item -> item.slot().equals(PetCatalogService.ACTIVITY)
                ? !bundle.activity().equals(PetCatalogService.NO_ACTIVITY) && item.code().equals(bundle.activity())
                : item.code().equals(bundle.outfit().get(item.slot()))).toList();
        var missing = items.stream().filter(item -> !item.owned()).toList();
        var fullPrice = missing.stream().mapToInt(ShopItemResponse::price).sum();
        var price = missing.size() >= 2 ? fullPrice * 80 / 100 : fullPrice;
        var reason = missing.stream().filter(item -> item.kind() == PetItemKind.EXCLUSIVE)
                .map(item -> "Вещь «" + item.label() + "» ещё не твоя: " + item.hint())
                .collect(Collectors.joining("; "));
        return new ShopBundleResponse(bundle.code(), bundle.label(), bundle.category(), bundle.outfit(), bundle.activity(), items,
                fullPrice, price, missing.size(), missing.isEmpty(), !reason.isEmpty(), reason.isEmpty() ? null : reason);
    }
}
