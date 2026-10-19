package com.hackathon.app.domain.mapper;

import java.util.UUID;

import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.dto.UserSportResponse;
import com.hackathon.app.domain.entity.UserSport;
import com.hackathon.app.domain.enums.SportLevel;
import org.mapstruct.Mapper;

@Mapper(config = MappingConfig.class)
public interface UserSportMapper {

	UserSport toEntity(UUID userId, UUID sportId, SportLevel level);

	UserSportResponse toResponse(SportResponse sport, SportLevel level);
}
