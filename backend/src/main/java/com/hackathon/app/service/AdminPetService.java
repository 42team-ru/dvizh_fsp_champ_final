package com.hackathon.app.service;

import java.util.HexFormat;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.concurrent.ThreadLocalRandom;

import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.PetArtPreviewResponse;
import com.hackathon.app.domain.dto.PetFitRequest;
import com.hackathon.app.domain.dto.PetItemResponse;
import com.hackathon.app.domain.entity.PetItem;
import com.hackathon.app.domain.enums.PetBodyPart;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.mapper.PetMapper;
import com.hackathon.app.repository.PetItemRepository;
import com.hackathon.app.repository.PetSlotRepository;
import com.hackathon.app.repository.UserPetEquipmentRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Свои вещи бобра в админке: картинка (PNG или SVG) → безопасный SVG и посадка на выбранную часть тела.
 * Роль ADMIN проверяет SecurityConfig (/api/admin/**). Встроенные вещи (их рисует фронт) здесь не меняются.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPetService {

	private static final int MAX_LABEL = 100;

	private final PetArtImporter importer;
	private final PetSlotRepository slots;
	private final PetItemRepository items;
	private final UserPetEquipmentRepository equipment;
	private final PetMapper mapper;

	/** Разобрать картинку и показать посадку, ничего не сохраняя. */
	public PetArtPreviewResponse preview(PetBodyPart part, FileUpload file) {
		return importer.parse(requirePart(part), file.content());
	}

	/** Вещи от админа, новые сверху. */
	@Transactional(readOnly = true)
	public List<PetItemResponse> list() {
		return items.findByBuiltInFalseOrderByCreatedAtDesc().stream().map(mapper::toItemResponse).toList();
	}

	/**
	 * Новая вещь в слот части тела, в конец списка. Посадку считает скрипт; переданный fit (после предпросмотра)
	 * её заменяет. Код генерируется: под ним вещь хранится в образах пользователей.
	 */
	@Transactional
	public PetItemResponse create(PetBodyPart part, String label, FileUpload file, PetFitRequest fit) {
		var cleanLabel = Strings.blankToNull(label);
		if (cleanLabel == null || cleanLabel.length() > MAX_LABEL) {
			throw new BadRequestException("Укажите название вещи (до " + MAX_LABEL + " символов)");
		}
		checkFit(fit);
		var art = importer.parse(requirePart(part), file.content()).art();
		var slot = slots.findByCode(part.getSlotCode())
				.orElseThrow(() -> new IllegalStateException("Built-in pet slot missing: " + part.getSlotCode()));
		var code = "custom-" + HexFormat.of().toHexDigits(ThreadLocalRandom.current().nextInt());
		var item = items.saveAndFlush(mapper.toCustomItem(slot.getId(), code, cleanLabel,
				items.maxPosition(slot.getId()) + 1, part, art.svg(),
				fit == null ? art.x() : fit.x(), fit == null ? art.y() : fit.y(), fit == null ? art.scale() : fit.scale()));
		log.info("Pet item created: slot={}, code={}, part={}", slot.getCode(), code, part);
		return mapper.toItemResponse(item);
	}

	/** Подогнать посадку уже добавленной вещи. */
	@Transactional
	public PetItemResponse updateFit(String code, PetFitRequest fit) {
		var item = custom(code);
		mapper.updateFit(item, fit.x(), fit.y(), fit.scale());
		log.info("Pet item fit updated: code={}, fit={}", code, fit);
		return mapper.toItemResponse(items.saveAndFlush(item));
	}

	/** Удалить вещь: снимается со всех бобров. */
	@Transactional
	public void delete(String code) {
		var item = custom(code);
		equipment.deleteByItemId(item.getId());
		items.deleteById(item.getId());
		log.info("Pet item deleted: code={}", code);
	}

	private PetItem custom(String code) {
		return items.findByCodeAndBuiltInFalse(code)
				.orElseThrow(() -> new NoSuchElementException("Вещь «" + code + "» не найдена"));
	}

	/** Те же границы, что в PetFitRequest: в multipart-запросе @Valid не срабатывает. */
	private static void checkFit(PetFitRequest fit) {
		if (fit != null && (fit.x() < -500 || fit.x() > 1000 || fit.y() < -500 || fit.y() > 1000
				|| fit.scale() < 0.01 || fit.scale() > 20)) {
			throw new BadRequestException("Посадка вне рисунка: x и y от −500 до 1000, масштаб от 0.01 до 20");
		}
	}

	private static PetBodyPart requirePart(PetBodyPart part) {
		if (part == null) {
			throw new BadRequestException("Выберите, на какую часть тела надевается вещь");
		}
		return part;
	}
}
