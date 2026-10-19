package com.hackathon.app.domain.mapper;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.hackathon.app.domain.dto.HomePoint;
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
    @Mapping(target = "homeLat", source = "request.home.lat")
    @Mapping(target = "homeLon", source = "request.home.lon")
    void update(@MappingTarget UserPreferences preferences, UUID userId, SaveUserPreferencesRequest request);

    @Mapping(target = "helpers.reminders", source = "reminders")
    @Mapping(target = "helpers.nearby", source = "nearby")
    @Mapping(target = "helpers.cheer", source = "cheer")
    @Mapping(target = "home", expression = "java(home(preferences.getHomeLat(), preferences.getHomeLon()))")
    UserPreferencesResponse toResponse(UserPreferences preferences);

    /** Домашняя точка; null — не задана. */
    default HomePoint home(Double lat, Double lon) {
        return lat == null || lon == null ? null : new HomePoint(lat, lon);
    }

    default List<DayOfWeek> sortedDays(Set<DayOfWeek> days) {
        return days.stream().sorted().toList();
    }
}
