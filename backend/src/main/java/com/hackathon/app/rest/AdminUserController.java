package com.hackathon.app.rest;

import com.hackathon.app.domain.dto.AdminUserResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.enums.SystemRole;
import com.hackathon.app.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "admin", description = "Администрирование")
@RestController
@RequestMapping(path = "/api/admin/users", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AdminUserController {
    private final AdminUserService users;

    @GetMapping
    @Operation(operationId = "admin_listUsers", summary = "Поиск пользователей",
            description = "По логину, email, имени и фамилии; новые сверху. Счётчики включают созданные мероприятия и подтверждённые записи.")
    PageResponse<AdminUserResponse> list(@RequestParam(required = false) String searchText,
            @RequestParam(required = false) SystemRole role, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.info("Endpoint called: GET /api/admin/users, searchText={}, role={}, page={}, size={}", searchText, role, page, size);
        var response = users.list(searchText, role, page, size);
        log.info("Endpoint response: GET /api/admin/users, total={}", response.totalElements());
        return response;
    }
}
