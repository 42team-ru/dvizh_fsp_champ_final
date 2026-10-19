package com.hackathon.app.domain.mapper;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.PetArtResponse;
import com.hackathon.app.domain.dto.PetItemResponse;
import com.hackathon.app.domain.dto.PetSlotResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.PetItem;
import com.hackathon.app.domain.entity.PetSlot;
import com.hackathon.app.domain.entity.UserPetEquipment;
import com.hackathon.app.domain.enums.PetItemKind;
import com.hackathon.app.domain.enums.PetBodyPart;
import com.hackathon.app.domain.enums.PetSlotKind;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = MappingConfig.class)
public interface PetMapper {

	/** Запомнить, когда бобра развеселили. */
	void cheer(@MappingTarget AppUser user, java.time.Instant petCheeredAt);

	/** Сменить только имя, сохранив остальные поля аккаунта. */
	void rename(@MappingTarget AppUser user, String petName);

	PetSlot toSlot(String code, String label, PetSlotKind kind, int position, boolean builtIn);

	PetItem toItem(UUID slotId, String code, String label, boolean builtIn, int position);

	/** Цена, вид и подсказка вещи; вызывается и для уже существующих вещей при старте. */
	void economy(@MappingTarget PetItem item, int price, PetItemKind kind, String unlockHint);
	/** Своя вещь админа: рисунок и посадка уже проверены сервисом. Продаётся в магазине по цене по умолчанию. */
	@Mapping(target = "kind", constant = "SHOP")
	@Mapping(target = "price", constant = "100")
	PetItem toCustomItem(UUID slotId, String code, String label, int position, PetBodyPart bodyPart, String svg,
			Double fitX, Double fitY, Double fitScale);

	/** Ручная подгонка посадки. */
	void updateFit(@MappingTarget PetItem item, Double fitX, Double fitY, Double fitScale);

	UserPetEquipment toEquipment(UUID userId, UUID slotId, UUID itemId);

	/** Сменить вещь в уже занятом слоте. */
	void equip(@MappingTarget UserPetEquipment equipment, UUID itemId);

	@Mapping(target = "id", source = "code")
	@Mapping(target = "art", source = "item")
	PetItemResponse toItemResponse(PetItem item);

	/** Рисунок есть только у вещей от админа. */
	default PetArtResponse toArt(PetItem item) {
		return item.getSvg() == null ? null
				: new PetArtResponse(item.getBodyPart(), item.getSvg(), item.getFitX(), item.getFitY(), item.getFitScale());
	}

	@Mapping(target = "id", source = "slot.code")
	PetSlotResponse toSlotResponse(PetSlot slot, List<PetItemResponse> items);
}
