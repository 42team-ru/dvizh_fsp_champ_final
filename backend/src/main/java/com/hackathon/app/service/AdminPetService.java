package com.hackathon.app.service;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.regex.Pattern;

import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.dto.PetItemResponse;
import com.hackathon.app.domain.dto.PetSlotResponse;
import com.hackathon.app.domain.enums.FileKind;
import com.hackathon.app.domain.enums.PetSlotKind;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.mapper.PetMapper;
import com.hackathon.app.repository.PetItemRepository;
import com.hackathon.app.repository.PetSlotRepository;
import com.hackathon.app.repository.StoredFileRepository;
import com.hackathon.app.repository.UserPetEquipmentRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Админка каталога бобра: новые слоты одежды (атрибуты) и отдельные вещи с картинкой в S3.
 * Роль ADMIN проверяет SecurityConfig (/api/admin/**). Встроенные слоты и вещи (их рисует фронт) не удаляются.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminPetService {

	private static final Pattern ITEM_CODE = Pattern.compile("[a-z0-9][a-z0-9-]{1,59}");

	private final PetSlotRepository slots;
	private final PetItemRepository items;
	private final UserPetEquipmentRepository equipment;
	private final StoredFileRepository storedFiles;
	private final FileService files;
	private final PetMapper mapper;

	/** Новый слот одежды встаёт в конец конструктора. Код уже занят — 409. */
	@Transactional
	public PetSlotResponse createSlot(String code, String label) {
		if (slots.existsByCode(code)) {
			throw new ConflictException("Слот «" + code + "» уже есть");
		}
		var slot = slots.saveAndFlush(mapper.toSlot(code, label.strip(), PetSlotKind.OUTFIT, slots.maxPosition() + 1, false));
		log.info("Pet slot created: code={}", code);
		return mapper.toSlotResponse(slot, List.of());
	}

	/**
	 * Новая вещь в слот одежды или инвентарь, картинка (PNG, WebP, JPG до 5 МБ) — в S3.
	 */
	@Transactional
	public PetItemResponse createItem(String slotCode, String code, String label, FileUpload image,
			UUID adminId) {
		var slot = slots.findByCode(slotCode)
				.orElseThrow(() -> new NoSuchElementException("Слот «" + slotCode + "» не найден"));
		if (slot.getKind() == PetSlotKind.MOOD) {
			throw new BadRequestException("Настроения рисует фронт: новые вещи добавляются в одежду и инвентарь");
		}
		var cleanCode = Strings.blankToNull(code);
		if (cleanCode == null || !ITEM_CODE.matcher(cleanCode).matches() || cleanCode.equals(PetCatalogService.NO_ACTIVITY)) {
			throw new BadRequestException(
					"Код вещи: 2–60 символов, латиница в нижнем регистре, цифры и дефис; «none» занят");
		}
		var cleanLabel = Strings.blankToNull(label);
		if (cleanLabel == null || cleanLabel.length() > 200) {
			throw new BadRequestException("Укажите подпись вещи (до 200 символов)");
		}
		if (items.existsBySlotIdAndCode(slot.getId(), cleanCode)) {
			throw new ConflictException("Вещь «" + cleanCode + "» уже есть в слоте «" + slot.getLabel() + "»");
		}
		var file = files.store(FileKind.PET_ITEM, image, adminId, null, null, null);
		var item = items.saveAndFlush(mapper.toItem(slot.getId(), cleanCode, cleanLabel, file.getId(), false,
				items.maxPosition(slot.getId()) + 1));
		log.info("Pet item created: slot={}, code={}, fileId={}", slotCode, cleanCode, file.getId());
		return mapper.toItemResponse(item);
	}

	/** Удалить добавленную вещь: снимается со всех бобров, картинка удаляется из S3. */
	@Transactional
	public void deleteItem(String slotCode, String itemCode) {
		var slot = slots.findByCode(slotCode)
				.orElseThrow(() -> new NoSuchElementException("Слот «" + slotCode + "» не найден"));
		var item = items.findBySlotIdAndCode(slot.getId(), itemCode)
				.orElseThrow(() -> new NoSuchElementException("Вещь «" + itemCode + "» не найдена"));
		if (item.isBuiltIn()) {
			throw new ConflictException("Встроенную вещь удалить нельзя: её рисует фронт");
		}
		equipment.deleteByItemId(item.getId());
		items.delete(item);
		items.flush();
		if (item.getImageFileId() != null) {
			storedFiles.findById(item.getImageFileId()).ifPresent(files::delete);
		}
		log.info("Pet item deleted: slot={}, code={}", slotCode, itemCode);
	}
}
