package com.hackathon.app.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.PetCatalogResponse;
import com.hackathon.app.domain.dto.BundleCategoryResponse;
import com.hackathon.app.domain.entity.PetItem;
import com.hackathon.app.domain.entity.PetSlot;
import com.hackathon.app.domain.enums.PetItemKind;
import com.hackathon.app.domain.enums.PetSlotKind;
import com.hackathon.app.domain.mapper.PetMapper;
import com.hackathon.app.repository.PetItemRepository;
import com.hackathon.app.repository.PetSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Каталог бобра: слоты и вещи. Один и тот же снимок каталога отдаётся фронту и проверяет образ на сервере.
 * Встроенные слоты и вещи (их рисует фронт, beaver-wardrobe.ts) создаются при старте: так каталог есть и в Postgres,
 * и в тестах на H2, где миграции не запускаются. Коды из docs/beaver-backend-integration.md не переименовывать.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PetCatalogService {

	static final String ACTIVITY = "activity";
	static final String NO_ACTIVITY = "none";

    /** Последняя волна каталога: новые виды экипировки и все фоны. */
    static boolean isNew(String slot, String code) {
        return slot.equals("background") || java.util.Set.of("cyclehelmet", "roundglasses", "scarf", "bowtie",
                "shorts", "leggings", "sweatpants", "basketball", "volleyball", "polo", "hoodie", "tracksuit",
                "puffer", "racket", "paddle", "yogamat", "boxinggloves", "wristbands", "sneakers").contains(code);
    }

	private record BuiltInSlot(String code, String label, PetSlotKind kind, List<BuiltInItem> items) {
	}

	private record BuiltInItem(String code, String label) {
	}

	private static BuiltInItem item(String code, String label) {
		return new BuiltInItem(code, label);
	}

	private static final List<BuiltInSlot> BUILT_IN = List.of(
			new BuiltInSlot(ACTIVITY, "Инвентарь", PetSlotKind.ACTIVITY, List.of(
					item("none", "Без инвентаря"), item("juggle", "Футбольный мяч"), item("dribble", "Баскетбольный мяч"),
					item("lift", "Гантели"), item("chess", "Шахматная доска и фигуры"), item("ski", "Лыжи и палки"),
					item("hockey", "Скользящая шайба"), item("esports", "Игровой ноутбук"),
					item("programming", "Ноутбук с кодом"))),
			new BuiltInSlot("shirt", "Одежда", PetSlotKind.OUTFIT, List.of(
					item("basketball", "Баскетбольная майка"), item("volleyball", "Волейбольная форма"),
                    item("polo", "Теннисное поло"), item("hoodie", "Лавандовое худи"),
                    item("tracksuit", "Спортивная куртка"), item("puffer", "Зимний пуховик"),
                    item("football", "Футбольная форма"), item("running", "Беговая майка"),
					item("training", "Тренировочная футболка"), item("judo", "Кимоно"),
					item("hockey", "Хоккейный свитер и краги"), item("programming", "Футболка ФСП России"),
					item("hc-cska", "Хоккейная форма — ЦСКА (Москва)"),
					item("hc-metallurg", "Хоккейная форма — Металлург (Магнитогорск)"),
					item("hc-lokomotiv", "Хоккейная форма — Локомотив (Ярославль)"),
					item("hc-severstal", "Хоккейная форма — Северсталь (Череповец)"),
					item("hc-torpedo", "Хоккейная форма — Торпедо (Нижний Новгород)"),
					item("hc-barys", "Хоккейная форма — Барыс (Астана)"),
					item("hc-spartak", "Хоккейная форма — Спартак (Москва)"),
					item("hc-neftekhimik", "Хоккейная форма — Нефтехимик (Нижнекамск)"),
					item("hc-sokol", "Хоккейная форма — Сокол (Красноярск)"),
					item("zenit", "Футболка «Зенит»"), item("cska", "Футболка «ЦСКА»"), item("fakel", "Футболка «Факел»"),
					item("yenisey", "Футболка «Енисей»"), item("krasnodar", "Футболка «Краснодар»"),
					item("lokomotiv", "Футболка «Локомотив»"), item("spartak", "Футболка «Спартак»"),
					item("rostov", "Футболка «Ростов»"), item("dynamo", "Футболка «Динамо»"),
					item("akron", "Футболка «Акрон»"), item("beavers", "Футболка «Хищные бобры»"))),
			new BuiltInSlot("hat", "Головной убор", PetSlotKind.OUTFIT, List.of(
					item("cyclehelmet", "Велошлем"), item("cap", "Кепка"), item("headband", "Повязка"), item("beanie", "Вязаная шапка"),
					item("swimcap", "Шапочка для плавания"), item("helmet", "Хоккейный шлем"),
					item("headphones", "Игровые наушники с микрофоном"), item("crown", "Корона организатора"))),
			new BuiltInSlot("eyewear", "Очки", PetSlotKind.OUTFIT, List.of(
					item("roundglasses", "Круглые очки"), item("sunglasses", "Солнцезащитные"), item("goggles", "Для плавания"))),
			new BuiltInSlot("neck", "На шее", PetSlotKind.OUTFIT, List.of(
					item("scarf", "Тёплый шарф"), item("bowtie", "Галстук-бабочка"), item("medal", "Медаль"), item("whistle", "Свисток"))),
			new BuiltInSlot("bottom", "Низ и экипировка", PetSlotKind.OUTFIT, List.of(
					item("swimshorts", "Плавки с жёлтой отделкой"), item("hockeypants", "Хоккейные шорты и коньки"),
                    item("shorts", "Спортивные шорты"), item("leggings", "Легинсы"), item("sweatpants", "Спортивные брюки"))),
            new BuiltInSlot("prop", "Предмет", PetSlotKind.OUTFIT, List.of(
                    item("volleyball", "Волейбольный мяч"), item("racket", "Теннисная ракетка"),
                    item("paddle", "Ракетка для настольного тенниса"), item("yogamat", "Коврик для йоги"))),
            new BuiltInSlot("paws", "На лапах", PetSlotKind.OUTFIT, List.of(
                    item("boxinggloves", "Боксёрские перчатки"), item("wristbands", "Напульсники"))),
            new BuiltInSlot("feet", "Обувь", PetSlotKind.OUTFIT, List.of(item("sneakers", "Кроссовки"))),
            // Фон — необязательный элемент outfit: владение и полная замена работают без особых правил.
            new BuiltInSlot("background", "Фон", PetSlotKind.OUTFIT, List.of(
                    item("meadow", "Солнечная поляна"), item("stadium", "Стадион"), item("rink", "Ледовая арена"),
                    item("river", "Набережная"), item("snowpark", "Снежный парк"), item("gym", "Спортзал"),
                    item("sunset", "Закат для йоги"), item("nightcity", "Ночной город"))));

	/** Готовый образ: отсутствующие слоты снимаются при надевании. */
	record Bundle(
			/** Стабильный код комплекта. */
			String code,
			/** Название для магазина и журнала. */
			String label,
            /** Вид спорта: стабильный код и русское название. */
            BundleCategoryResponse category,
			/** Полный набор одежды по слотам. */
			Map<String, String> outfit,
			/** Инвентарь или none. */
			String activity) {}

	/** Комплекты повторяют готовые образы отладочной страницы питомца. */
	static final List<Bundle> BUNDLES = bundles();

	private static List<Bundle> bundles() {
		var result = new java.util.ArrayList<>(List.of(
				new Bundle("football", "Футбол", category("football", "Футбол"), Map.of("shirt", "football", "hat", "cap"), "juggle"),
				new Bundle("basketball", "Баскетбол", category("basketball", "Баскетбол"), Map.of("shirt", "basketball", "hat", "headband"), "dribble"),
				new Bundle("running", "Бег", category("running", "Бег"), Map.of("shirt", "running", "hat", "headband", "eyewear", "sunglasses", "neck", "medal"), "none"),
				new Bundle("fitness", "Фитнес", category("fitness", "Йога и фитнес"), Map.of("shirt", "training", "neck", "whistle", "background", "meadow"), "lift"),
				new Bundle("chess", "Шахматы", category("chess", "Шахматы"), Map.of(), "chess"),
				new Bundle("swimming", "Плавание", category("water", "Водные"), Map.of("hat", "swimcap", "eyewear", "goggles", "bottom", "swimshorts"), "none"),
				new Bundle("judo", "Дзюдо", category("martial", "Единоборства"), Map.of("shirt", "judo"), "none"),
				new Bundle("ski", "Лыжи", category("winter", "Зимние"), Map.of("hat", "beanie", "eyewear", "sunglasses", "shirt", "training"), "ski"),
				new Bundle("hockey", "Хоккей", category("hockey", "Хоккей"), Map.of("shirt", "hockey", "hat", "helmet", "bottom", "hockeypants"), "hockey"),
				new Bundle("esports", "Киберспорт", category("esports", "Киберспорт"), Map.of("shirt", "training", "hat", "headphones"), "esports"),
				new Bundle("programming", "Спортивное программирование", category("esports", "Киберспорт"), Map.of("shirt", "programming"), "programming"),
				new Bundle("phygital", "Фиджитал", category("esports", "Киберспорт"), Map.of("shirt", "running", "hat", "headphones", "neck", "medal"), "esports")));
		BUILT_IN.stream().filter(slot -> slot.code().equals("shirt")).flatMap(slot -> slot.items().stream())
				.forEach(item -> {
					if (item.code().startsWith("hc-")) {
						result.add(new Bundle(item.code(), item.label().replace("Хоккейная форма — ", "ХК "), category("hockey", "Хоккей"),
								Map.of("shirt", item.code(), "hat", "helmet", "bottom", "hockeypants"), "hockey"));
					} else if (item.label().startsWith("Футболка «")) {
						result.add(new Bundle(item.code(), item.label().replace("Футболка «", "").replace("»", ""), category("football", "Футбол"),
								Map.of("shirt", item.code()), "juggle"));
					}
				});
        result.add(new Bundle("streetball", "Стритбол", category("basketball", "Баскетбол"),
                Map.of("shirt", "basketball", "bottom", "shorts", "paws", "wristbands", "feet", "sneakers", "background", "stadium"), "dribble"));
        result.add(new Bundle("river-run", "Пробежка у реки", category("running", "Бег"),
                Map.of("shirt", "running", "bottom", "shorts", "feet", "sneakers", "background", "river"), "none"));
        result.add(new Bundle("volleyball", "Волейбол", category("volleyball", "Волейбол"),
                Map.of("shirt", "volleyball", "bottom", "shorts", "prop", "volleyball", "paws", "wristbands", "background", "gym"), "none"));
        result.add(new Bundle("beach-volley", "Пляжный волейбол", category("volleyball", "Волейбол"),
                Map.of("hat", "cap", "bottom", "swimshorts", "prop", "volleyball", "eyewear", "sunglasses", "background", "river"), "none"));
        result.add(new Bundle("tennis", "Большой теннис", category("rackets", "Ракетки"),
                Map.of("shirt", "polo", "bottom", "shorts", "prop", "racket", "paws", "wristbands", "feet", "sneakers", "background", "stadium"), "none"));
        result.add(new Bundle("table-tennis", "Настольный теннис", category("rackets", "Ракетки"),
                Map.of("shirt", "polo", "prop", "paddle", "bottom", "sweatpants", "background", "gym"), "none"));
        result.add(new Bundle("yoga", "Йога на закате", category("fitness", "Йога и фитнес"),
                Map.of("shirt", "training", "bottom", "leggings", "prop", "yogamat", "background", "sunset"), "none"));
        result.add(new Bundle("stretching", "Утренняя зарядка", category("fitness", "Йога и фитнес"),
                Map.of("shirt", "hoodie", "bottom", "leggings", "prop", "yogamat", "background", "meadow"), "none"));
        result.add(new Bundle("cycling", "Велопрогулка", category("cycling", "Велоспорт"),
                Map.of("hat", "cyclehelmet", "shirt", "tracksuit", "bottom", "shorts", "feet", "sneakers", "background", "meadow"), "none"));
        result.add(new Bundle("city-cycling", "Вечерний велозаезд", category("cycling", "Велоспорт"),
                Map.of("hat", "cyclehelmet", "shirt", "running", "bottom", "leggings", "eyewear", "sunglasses", "background", "nightcity"), "none"));
        result.add(new Bundle("winter-walk", "Зимняя прогулка", category("winter", "Зимние"),
                Map.of("hat", "beanie", "shirt", "puffer", "neck", "scarf", "bottom", "sweatpants", "background", "snowpark"), "ski"));
        result.add(new Bundle("river-swim", "Заплыв у набережной", category("water", "Водные"),
                Map.of("hat", "swimcap", "eyewear", "goggles", "bottom", "swimshorts", "background", "river"), "none"));
        result.add(new Bundle("boxing", "Бокс в зале", category("martial", "Единоборства"),
                Map.of("shirt", "training", "paws", "boxinggloves", "bottom", "shorts", "background", "gym"), "none"));
        result.add(new Bundle("chess-club", "Шахматный клуб", category("chess", "Шахматы"),
                Map.of("shirt", "polo", "eyewear", "roundglasses", "neck", "bowtie", "background", "sunset"), "chess"));
        result.add(new Bundle("cozy", "После тренировки", category("casual", "Повседневное"),
                Map.of("shirt", "hoodie", "bottom", "sweatpants", "neck", "scarf", "background", "snowpark"), "none"));
        result.add(new Bundle("city-walk", "Городской спортсмен", category("casual", "Повседневное"),
                Map.of("shirt", "tracksuit", "bottom", "sweatpants", "feet", "sneakers", "eyewear", "roundglasses", "background", "nightcity"), "none"));
		return List.copyOf(result);
	}

	private static BundleCategoryResponse category(String code, String label) {
        return new BundleCategoryResponse(code, label);
    }

	/** Вещи комплекта; пустой инвентарь не считается вещью комплекта. */
	List<PetItem> bundleItems(Catalog catalog, Bundle bundle) {
		var selected = new java.util.LinkedHashMap<>(bundle.outfit());
		selected.put(ACTIVITY, bundle.activity());
		var resolved = selected.entrySet().stream().map(entry -> {
			var slot = catalog.slot(entry.getKey()).orElseThrow(() ->
					new IllegalStateException("Неизвестный слот комплекта: " + entry.getKey()));
			if ((slot.getKind() == PetSlotKind.ACTIVITY) != entry.getKey().equals(ACTIVITY)) {
				throw new IllegalStateException("Неверный вид слота комплекта: " + entry.getKey());
			}
			return catalog.item(slot, entry.getValue()).orElseThrow(() ->
					new IllegalStateException("Неизвестная вещь комплекта: " + entry));
		}).toList();
		return resolved.stream().filter(item -> !item.getCode().equals(NO_ACTIVITY))
				.toList();
	}

	/** Цена, вид и подсказка вещи: ключ «слот:код». Вещи, которых тут нет, — магазин за 100 монет. */
	private record Economy(int price, PetItemKind kind, String hint) {
	}

	private static final Economy DEFAULT_ECONOMY = new Economy(100, PetItemKind.SHOP, null);

	private static final Map<String, Economy> ECONOMY = economy();

	private static Map<String, Economy> economy() {
		var m = new java.util.HashMap<String, Economy>();
		// Базовые: есть у всех сразу.
		for (var key : List.of("activity:none", "shirt:training", "hat:headband", "background:meadow")) {
			m.put(key, new Economy(0, PetItemKind.BASE, null));
		}
		// Эксклюзивы: только за достижения.
		m.put("neck:medal", new Economy(0, PetItemKind.EXCLUSIVE, "за 10 встреч"));
		m.put("hat:crown", new Economy(0, PetItemKind.EXCLUSIVE, "за 5 проведённых встреч"));
		m.put("shirt:beavers", new Economy(0, PetItemKind.EXCLUSIVE, "за встречу ССК ВГУ «Хищные бобры»"));
		// 50–80: мелочь.
		price(m, 60, "hat:cap", "hat:swimcap", "eyewear:goggles");
		price(m, 70, "hat:beanie", "eyewear:sunglasses");
		price(m, 50, "neck:whistle");
		price(m, 80, "bottom:swimshorts");
        price(m, 60, "neck:bowtie", "paws:wristbands");
        price(m, 70, "eyewear:roundglasses");
        price(m, 80, "neck:scarf");
        price(m, 100, "bottom:shorts", "background:stadium", "background:rink", "background:river", "background:snowpark");
        price(m, 100, "background:gym", "background:sunset", "background:nightcity");
        price(m, 120, "bottom:leggings", "bottom:sweatpants", "feet:sneakers", "shirt:basketball", "shirt:volleyball", "shirt:polo", "prop:volleyball");
        price(m, 130, "hat:cyclehelmet", "shirt:hoodie", "prop:paddle");
        price(m, 150, "shirt:tracksuit", "prop:racket", "prop:yogamat", "paws:boxinggloves");
        price(m, 180, "shirt:puffer");
		// 100–150: спортивная экипировка и инвентарь.
		price(m, 100, "shirt:running", "activity:juggle", "activity:dribble", "activity:hockey");
		price(m, 120, "shirt:football", "shirt:programming", "hat:helmet", "activity:lift", "activity:chess");
		price(m, 130, "hat:headphones");
		price(m, 150, "activity:ski");
		// 200–250: форма, кимоно, ноутбуки.
		price(m, 250, "shirt:judo", "activity:programming");
		price(m, 220, "shirt:hockey", "bottom:hockeypants", "activity:esports");
		for (var club : List.of("hc-cska", "hc-metallurg", "hc-lokomotiv", "hc-severstal", "hc-torpedo", "hc-barys",
				"hc-spartak", "hc-neftekhimik", "hc-sokol")) {
			price(m, 220, "shirt:" + club);
		}
		for (var club : List.of("zenit", "cska", "fakel", "yenisey", "krasnodar", "lokomotiv", "spartak", "rostov",
				"dynamo", "akron")) {
			price(m, 200, "shirt:" + club);
		}
		return m;
	}

	private static void price(Map<String, Economy> m, int price, String... keys) {
		for (var key : keys) {
			m.put(key, new Economy(price, PetItemKind.SHOP, null));
		}
	}

	private final PetSlotRepository slots;
	private final PetItemRepository items;
	private final PetMapper mapper;

	/**
	 * Снимок каталога на одну операцию: слоты по порядку и вещи по слотам.
	 */
	record Catalog(List<PetSlot> slots, Map<UUID, List<PetItem>> itemsBySlotId) {

		Optional<PetSlot> slot(String code) {
			return slots.stream().filter(s -> s.getCode().equals(code)).findFirst();
		}


		Optional<PetItem> item(PetSlot slot, String code) {
			return itemsBySlotId.getOrDefault(slot.getId(), List.of()).stream()
					.filter(i -> i.getCode().equals(code)).findFirst();
		}

		Map<UUID, PetItem> itemsById() {
			return itemsBySlotId.values().stream().flatMap(List::stream)
					.collect(Collectors.toMap(PetItem::getId, Function.identity()));
		}
	}

	/** Встроенные слоты и вещи, которых ещё нет. Существующие не трогаем. */
	@Order(Ordered.HIGHEST_PRECEDENCE)
	@EventListener(ApplicationReadyEvent.class)
	@Transactional
	public void seedBuiltIns() {
		int created = 0;
		for (int slotPosition = 0; slotPosition < BUILT_IN.size(); slotPosition++) {
			var builtIn = BUILT_IN.get(slotPosition);
			int position = slotPosition;
			var slot = slots.findByCode(builtIn.code()).orElseGet(() -> slots.saveAndFlush(
					mapper.toSlot(builtIn.code(), builtIn.label(), builtIn.kind(), position, true)));
			for (int itemPosition = 0; itemPosition < builtIn.items().size(); itemPosition++) {
				var builtInItem = builtIn.items().get(itemPosition);
				var economy = ECONOMY.getOrDefault(builtIn.code() + ":" + builtInItem.code(), DEFAULT_ECONOMY);
				var existing = items.findBySlotIdAndCode(slot.getId(), builtInItem.code()).orElse(null);
				if (existing == null) {
					existing = mapper.toItem(slot.getId(), builtInItem.code(), builtInItem.label(), true, itemPosition);
					created++;
				}
				// Цена, вид и подсказка живут в коде: при старте приводим к ним и уже созданные вещи.
				mapper.economy(existing, economy.price(), economy.kind(), economy.hint());
				items.save(existing);
			}
		}
		var catalog = load();
		BUNDLES.forEach(bundle -> bundleItems(catalog, bundle));
		if (created > 0) {
			log.info("Pet catalog: created {} built-in items", created);
		}
	}

	@Transactional(readOnly = true)
	Catalog load() {
		var itemsBySlot = items.findAllByOrderByPositionAsc().stream()
				.collect(Collectors.groupingBy(PetItem::getSlotId));
		return new Catalog(slots.findAllByOrderByPositionAsc(), itemsBySlot);
	}

	/** Каталог для конструктора: все вещи доступны всем. */
	@Transactional(readOnly = true)
	public PetCatalogResponse catalog() {
		var catalog = load();
		return new PetCatalogResponse(catalog.slots().stream()
				.sorted(Comparator.comparingInt(PetSlot::getPosition))
				.map(slot -> mapper.toSlotResponse(slot, catalog.itemsBySlotId().getOrDefault(slot.getId(), List.of())
						.stream().map(mapper::toItemResponse).toList()))
				.toList());
	}
}
