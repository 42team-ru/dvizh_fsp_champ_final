package com.hackathon.app.mapper;

import java.util.UUID;

import com.hackathon.app.dto.SportResponse;
import com.hackathon.app.entity.Sport;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MappingConfig.class)
public interface SportMapper {

	SportResponse toResponse(Sport sport);

	/** Свой вид спорта, который пользователь ввёл в форме мероприятия. */
	@Mapping(target = "custom", constant = "true")
	Sport toCustom(String name, String normalizedName, String slug, UUID createdById);
}
