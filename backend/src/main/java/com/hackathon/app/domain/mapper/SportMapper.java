package com.hackathon.app.domain.mapper;

import java.util.UUID;

import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.Sport;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MappingConfig.class)
public interface SportMapper {

	@Mapping(target = "imageUrl", expression = "java(\"/api/sports/\" + sport.getId() + \"/image\")")
	SportResponse toResponse(Sport sport);

	/** Свой вид спорта, который пользователь ввёл в форме мероприятия. */
	@Mapping(target = "custom", constant = "true")
	Sport toCustom(String name, String normalizedName, String slug, UUID createdById);
}
