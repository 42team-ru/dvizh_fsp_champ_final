package com.hackathon.app.domain.mapper;

import java.util.UUID;

import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.util.SportImages;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MappingConfig.class, imports = SportImages.class)
public interface SportMapper {

	@Mapping(target = "imageUrl", expression = "java(SportImages.url(sport.getSlug()))")
	SportResponse toResponse(Sport sport);

	/** Свой вид спорта, который пользователь ввёл в форме мероприятия. */
	@Mapping(target = "custom", constant = "true")
	Sport toCustom(String name, String normalizedName, String slug, UUID createdById);
}
