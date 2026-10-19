package com.hackathon.app.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.PetCatalogResponse;
import com.hackathon.app.domain.entity.PetItem;
import com.hackathon.app.domain.entity.PetSlot;
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

	static final String MOOD = "mood";
	static final String ACTIVITY = "activity";
	static final String DEFAULT_MOOD = "idle";
	static final String NO_ACTIVITY = "none";

	private record BuiltInSlot(String code, String label, PetSlotKind kind, List<BuiltInItem> items) {
	}

	private record BuiltInItem(String code, String label) {
	}

	private static BuiltInItem item(String code, String label) {
		return new BuiltInItem(code, label);
	}

	private static final List<BuiltInSlot> BUILT_IN = List.of(
			new BuiltInSlot(MOOD, "Настроение", PetSlotKind.MOOD, List.of(
					item("idle", "Спокойный"), item("happy", "Радость"), item("sad", "Грусть"), item("thinking", "Думает"))),
			new BuiltInSlot(ACTIVITY, "Инвентарь", PetSlotKind.ACTIVITY, List.of(
					item("none", "Без инвентаря"), item("juggle", "Футбольный мяч"), item("dribble", "Баскетбольный мяч"),
					item("lift", "Гантели"), item("chess", "Шахматная доска и фигуры"), item("ski", "Лыжи и палки"),
					item("hockey", "Скользящая шайба"), item("esports", "Игровой ноутбук"),
					item("programming", "Ноутбук с кодом"))),
			new BuiltInSlot("shirt", "Одежда", PetSlotKind.OUTFIT, List.of(
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
					item("cap", "Кепка"), item("headband", "Повязка"), item("beanie", "Вязаная шапка"),
					item("swimcap", "Шапочка для плавания"), item("helmet", "Хоккейный шлем"),
					item("headphones", "Игровые наушники с микрофоном"))),
			new BuiltInSlot("eyewear", "Очки", PetSlotKind.OUTFIT, List.of(
					item("sunglasses", "Солнцезащитные"), item("goggles", "Для плавания"))),
			new BuiltInSlot("neck", "На шее", PetSlotKind.OUTFIT, List.of(
					item("medal", "Медаль"), item("whistle", "Свисток"))),
			new BuiltInSlot("bottom", "Низ и экипировка", PetSlotKind.OUTFIT, List.of(
					item("swimshorts", "Плавки с жёлтой отделкой"), item("hockeypants", "Хоккейные шорты и коньки"))));

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

	/** Встроенные слоты и вещи, которых ещё нет. Существующие не трогаем (подписи мог поправить админ). */
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
				if (!items.existsBySlotIdAndCode(slot.getId(), builtInItem.code())) {
					items.save(mapper.toItem(slot.getId(), builtInItem.code(), builtInItem.label(), null, true,
							itemPosition));
					created++;
				}
			}
		}
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
