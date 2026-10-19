package com.hackathon.app.demo;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.dto.PetRequest;
import com.hackathon.app.domain.dto.ShopItemResponse;
import com.hackathon.app.domain.enums.PetItemKind;
import com.hackathon.app.service.PetService;
import com.hackathon.app.service.ShopService;
import com.hackathon.app.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Образы бобров. Всё, как в приложении: вещи покупаются в магазине на заработанные монеты ({@link ShopService#buy}),
 * эксклюзивы дают достижения, надевается только своё ({@link PetService#save}), имя меняется через {@link PetService#rename}.
 * Что не по карману или не получено — просто не надето.
 */
@Component
@RequiredArgsConstructor
class DemoPetSeeder {

	private static final String ACTIVITY = "activity";
	private static final String NO_ACTIVITY = "none";

	private final PetService pets;
	private final ShopService shop;
	private final WalletService wallet;

	/** Каталог магазина глазами человека: цены и «моё». */
	List<ShopItemResponse> catalogFor(UUID userId) {
		return shop.shop(userId);
	}

	/** Коды вещей слота, которые можно купить или уже есть у всех (эксклюзивы за достижения не предлагаем). */
	List<String> codes(List<ShopItemResponse> catalog, String slot) {
		return catalog.stream().filter(i -> i.slot().equals(slot) && i.kind() != PetItemKind.EXCLUSIVE)
				.map(ShopItemResponse::code).toList();
	}

	/** Слоты одежды (всё, кроме инвентаря). */
	List<String> outfitSlots(List<ShopItemResponse> catalog) {
		return catalog.stream().map(ShopItemResponse::slot).filter(s -> !s.equals(ACTIVITY)).distinct().toList();
	}

	/** Образы и имена основных персонажей. */
	void dressCore(DemoCast cast) {
		var anna = new LinkedHashMap<String, String>();
		anna.put("hat", "cap");
		anna.put("shirt", "beavers"); // «Свой бобр»: надевается, только если достижение получено
		dress(cast.id("anna"), "juggle", anna);

		var petr = new LinkedHashMap<String, String>();
		// Корону организатора Пётр получает за «Душа компании», но не надевает: на фронте её ещё не нарисовали.
		petr.put("hat", "cap");
		petr.put("shirt", "training");
		dress(cast.id("petr"), "chess", petr);
		pets.rename(cast.id("petr"), "Ферзь");

		var olga = new LinkedHashMap<String, String>();
		olga.put("neck", "whistle");
		olga.put("hat", "headband");
		olga.put("shirt", "training");
		dress(cast.id("olga"), "lift", olga);
		pets.rename(cast.id("olga"), "Бодрячок");
	}

	/**
	 * Купить желаемое, пока хватает монет (сначала одежда, потом инвентарь), и надеть то, что стало своим.
	 * Ничего своего сверх базового — образ не сохраняем.
	 */
	void dress(UUID userId, String activity, Map<String, String> outfit) {
		var items = shop.shop(userId);
		int balance = wallet.balance(userId);
		var wishes = new LinkedHashMap<String, String>();
		outfit.forEach((slot, code) -> wishes.put(slot + ":" + code, slot));
		if (!NO_ACTIVITY.equals(activity)) {
			wishes.put(ACTIVITY + ":" + activity, ACTIVITY);
		}
		for (var id : wishes.keySet()) {
			var item = items.stream().filter(i -> i.id().equals(id)).findFirst().orElse(null);
			if (item != null && !item.owned() && item.kind() == PetItemKind.SHOP && item.price() <= balance) {
				shop.buy(userId, id);
				balance -= item.price();
			}
		}
		var owned = shop.shop(userId).stream().filter(ShopItemResponse::owned).map(ShopItemResponse::id).toList();
		var wornOutfit = new LinkedHashMap<String, String>();
		outfit.forEach((slot, code) -> {
			if (owned.contains(slot + ":" + code)) {
				wornOutfit.put(slot, code);
			}
		});
		var wornActivity = owned.contains(ACTIVITY + ":" + activity) ? activity : NO_ACTIVITY;
		if (!wornOutfit.isEmpty() || !NO_ACTIVITY.equals(wornActivity)) {
			pets.save(userId, new PetRequest(wornActivity, wornOutfit));
		}
	}
}
