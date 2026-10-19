package com.hackathon.app.domain.mapper;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.PetItemResponse;
import com.hackathon.app.domain.dto.PetSlotResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.PetItem;
import com.hackathon.app.domain.entity.PetSlot;
import com.hackathon.app.domain.entity.UserPetEquipment;
import com.hackathon.app.domain.enums.PetItemKind;
import com.hackathon.app.domain.enums.PetSlotKind;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = MappingConfig.class)
public interface PetMapper {

	/** Сменить только имя, сохранив остальные поля аккаунта. */
	void rename(@MappingTarget AppUser user, String petName);

	PetSlot toSlot(String code, String label, PetSlotKind kind, int position, boolean builtIn);

	PetItem toItem(UUID slotId, String code, String label, boolean builtIn, int position);

	/** Цена, вид и подсказка вещи; вызывается и для уже существующих вещей при старте. */
	void economy(@MappingTarget PetItem item, int price, PetItemKind kind, String unlockHint);

	UserPetEquipment toEquipment(UUID userId, UUID slotId, UUID itemId);

	/** Сменить вещь в уже занятом слоте. */
	void equip(@MappingTarget UserPetEquipment equipment, UUID itemId);

	@Mapping(target = "id", source = "code")
	PetItemResponse toItemResponse(PetItem item);

	@Mapping(target = "id", source = "slot.code")
	PetSlotResponse toSlotResponse(PetSlot slot, List<PetItemResponse> items);
}
