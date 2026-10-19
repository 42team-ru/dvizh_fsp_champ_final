package com.hackathon.app.mapper;

import com.hackathon.app.dto.UserShortResponse;
import com.hackathon.app.entity.AppUser;
import org.mapstruct.Mapper;

@Mapper(config = MappingConfig.class)
public interface UserMapper {

	UserShortResponse toShort(AppUser user);
}
