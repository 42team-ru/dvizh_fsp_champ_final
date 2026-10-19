package com.hackathon.app.domain.mapper;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.domain.dto.SaveUserPreferencesRequest;
import com.hackathon.app.domain.dto.UserPreferencesResponse;
import com.hackathon.app.domain.entity.UserPreferences;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(config = MappingConfig.class)
public interface UserPreferencesMapper {
    @Mapping(target = "reminders", source = "request.helpers.reminders")
    @Mapping(target = "nearby", source = "request.helpers.nearby")
    @Mapping(target = "cheer", source = "request.helpers.cheer")
    void update(@MappingTarget UserPreferences preferences, UUID userId, SaveUserPreferencesRequest request);

    @Mapping(target = "helpers.reminders", source = "reminders")
    @Mapping(target = "helpers.nearby", source = "nearby")
    @Mapping(target = "helpers.cheer", source = "cheer")
    UserPreferencesResponse toResponse(UserPreferences preferences);

    default List<DayOfWeek> sortedDays(Set<DayOfWeek> days) {
        return days.stream().sorted().toList();
    }
}
