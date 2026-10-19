package com.hackathon.app.service;

import java.util.HashSet;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.ShopItemResponse;
import com.hackathon.app.domain.entity.PetItem;
import com.hackathon.app.domain.entity.PetSlot;
import com.hackathon.app.domain.enums.LedgerKind;
import com.hackathon.app.domain.enums.PetItemKind;
import com.hackathon.app.domain.enums.PetSlotKind;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.EconomyMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.UserItemRepository;
import com.hackathon.app.service.PetCatalogService.Catalog;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Магазин и инвентарь бобра. Базовые вещи есть у всех, остальные — в user_items (куплены или выданы за достижение).
 * Надеть можно только своё: это проверяет {@link #requireOwned}, им пользуется PetService.
 */
@Service
@RequiredArgsConstructor
public class ShopService {

	private final PetCatalogService catalogService;
	private final UserItemRepository userItems;
	private final AppUserRepository users;
	private final WalletService wallet;
	private final EconomyMapper mapper;
	private final DbTimeRepository time;

	/** Все вещи каталога с ценой, видом и признаком «моя». */
	@Transactional(readOnly = true)
	public List<ShopItemResponse> shop(UUID userId) {
		wallet.requireUserAccount(userId);
		var catalog = catalogService.load();
		var owned = ownedIds(userId, catalog);
		return catalog.slots().stream()
				.filter(s -> s.getKind() == PetSlotKind.OUTFIT || s.getKind() == PetSlotKind.ACTIVITY)
				.flatMap(slot -> catalog.itemsBySlotId().getOrDefault(slot.getId(), List.of()).stream()
						.map(item -> new ShopItemResponse(slot.getCode() + ":" + item.getCode(), slot.getCode(),
								item.getCode(), item.getLabel(), item.getPrice(), item.getKind(),
								owned.contains(item.getId()),
								item.getKind() == PetItemKind.EXCLUSIVE ? "Дают " + item.getUnlockHint() : null,
                                PetCatalogService.isNew(slot.getCode(), item.getCode()), item.getKind() == PetItemKind.EXCLUSIVE)))
				.toList();
	}

	/** Купить вещь: проверка баланса под блокировкой строки пользователя. */
	@Transactional
	public ShopItemResponse buy(UUID userId, String id) {
		wallet.requireUserAccount(userId);
		var catalog = catalogService.load();
		var item = find(catalog, id);
		var slot = slotOf(catalog, item);
		if (item.getKind() == PetItemKind.EXCLUSIVE) {
			throw new ConflictException("Эту вещь нельзя купить — её дают " + item.getUnlockHint());
		}
		users.findByIdForUpdate(userId).orElseThrow(() -> new NoSuchElementException("Пользователь не найден"));
		if (ownedIds(userId, catalog).contains(item.getId())) {
			throw new ConflictException("Эта вещь уже у тебя");
		}
		wallet.apply(userId, -item.getPrice(), LedgerKind.PURCHASE, "PURCHASE:" + item.getId() + ":" + userId,
				"Покупка: " + item.getLabel(), null, null, time.now());
		userItems.save(mapper.toUserItem(userId, item.getId()));
		return new ShopItemResponse(slot.getCode() + ":" + item.getCode(), slot.getCode(), item.getCode(),
				item.getLabel(), item.getPrice(), item.getKind(), true, null, PetCatalogService.isNew(slot.getCode(), item.getCode()), false);
	}

	/** Выдать вещь (награда за достижение, демо); повторная выдача ничего не меняет. id — «слот:код». */
	@Transactional
	public void grant(UUID userId, String id) {
		var item = find(catalogService.load(), id);
		if (!userItems.existsByUserIdAndItemId(userId, item.getId())) {
			userItems.save(mapper.toUserItem(userId, item.getId()));
		}
	}

	/** Есть ли у пользователя вещь «слот:код». */
	@Transactional(readOnly = true)
	public boolean owns(UUID userId, String id) {
		var catalog = catalogService.load();
		return ownedIds(userId, catalog).contains(find(catalog, id).getId());
	}

	/** Подпись вещи по id «слот:код». */
	@Transactional(readOnly = true)
	public String itemLabel(String id) {
		return find(catalogService.load(), id).getLabel();
	}

	/** Надеть можно только своё; иначе 409 с подсказкой, как получить. */
	@Transactional(readOnly = true)
	public void requireOwned(UUID userId, Catalog catalog, Iterable<PetItem> wanted) {
		var owned = ownedIds(userId, catalog);
		for (var item : wanted) {
			if (!owned.contains(item.getId())) {
				throw new ConflictException("Вещь «" + item.getLabel() + "» ещё не твоя: " + howToGet(item));
			}
		}
	}

	private static String howToGet(PetItem item) {
		return item.getKind() == PetItemKind.EXCLUSIVE ? "её дают " + item.getUnlockHint()
				: "купи её в магазине за " + item.getPrice() + " монет";
	}

	/** Id вещей пользователя: базовые у всех плюс инвентарь. */
	private Set<UUID> ownedIds(UUID userId, Catalog catalog) {
		var owned = new HashSet<UUID>(userItems.findByUserId(userId).stream().map(i -> i.getItemId())
				.collect(Collectors.toSet()));
		catalog.itemsById().values().stream().filter(i -> i.getKind() == PetItemKind.BASE)
				.forEach(i -> owned.add(i.getId()));
		return owned;
	}

	private static PetItem find(Catalog catalog, String id) {
		var parts = id.split(":", 2);
		if (parts.length == 2) {
			var slot = catalog.slot(parts[0]);
			if (slot.isPresent()) {
				var item = catalog.item(slot.get(), parts[1]);
				if (item.isPresent()) {
					return item.get();
				}
			}
		}
		throw new NoSuchElementException("Вещь «" + id + "» не найдена");
	}

	private static PetSlot slotOf(Catalog catalog, PetItem item) {
		return catalog.slots().stream().filter(s -> s.getId().equals(item.getSlotId())).findFirst().orElseThrow();
	}
}
