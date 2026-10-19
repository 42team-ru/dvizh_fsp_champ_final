package com.hackathon.app.service;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import com.hackathon.app.domain.dto.AdminUserResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.domain.mapper.UserMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.EventRepository;
import com.hackathon.app.repository.RegistrationRepository;
import com.hackathon.app.repository.UserCount;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Поиск пользователей со счётчиками, загружаемыми пакетно для страницы. */
@Service
@RequiredArgsConstructor
public class AdminUserService {
    private final AppUserRepository users;
    private final EventRepository events;
    private final RegistrationRepository registrations;
    private final UserMapper mapper;

    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> list(String searchText, SystemRole role, int page, int size) {
        var pattern = searchText == null || searchText.isBlank() ? "%" : "%" + searchText.trim().toLowerCase(Locale.ROOT) + "%";
        var result = users.search(pattern, role, PageRequest.of(Math.max(0, page), Math.clamp(size, 1, 100),
                Sort.by(Sort.Direction.DESC, "createdAt", "id")));
        var ids = result.getContent().stream().map(AppUser::getId).toList();
        var eventCounts = ids.isEmpty() ? Map.<UUID, Long>of() : counts(events.countAuthoredByUsers(ids));
        var registrationCounts = ids.isEmpty() ? Map.<UUID, Long>of() : counts(registrations.countConfirmedByUsers(ids));
        return PageResponse.of(result, user -> mapper.toAdmin(user, eventCounts.getOrDefault(user.getId(), 0L),
                registrationCounts.getOrDefault(user.getId(), 0L)));
    }

    private static Map<UUID, Long> counts(List<UserCount> counts) {
        return counts.stream().collect(Collectors.toMap(UserCount::getUserId, UserCount::getCount));
    }
}
