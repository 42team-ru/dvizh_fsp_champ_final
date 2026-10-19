package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.dto.EventFilter;
import com.hackathon.app.dto.EventRequest;
import com.hackathon.app.dto.EventResponse;
import com.hackathon.app.dto.EventSummaryResponse;
import com.hackathon.app.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "events")
@RestController
@RequestMapping(path = "/api/events", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class EventController {

    private final EventService events;

    @GetMapping
    @Operation(operationId = "events_list")
    List<EventSummaryResponse> list(@AuthenticationPrincipal Jwt jwt, @ParameterObject EventFilter filter) {
        log.info("Endpoint called: GET /api/events, userId={}, request={}", jwt.getSubject(), filter);
        var response = events.list(filter, userId(jwt));
        log.info("Endpoint response: GET /api/events, count={}", response.size());
        return response;
    }

    @GetMapping("/mine")
    @Operation(operationId = "events_mine")
    List<EventSummaryResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: GET /api/events/mine, userId={}", jwt.getSubject());
        var response = events.mine(userId(jwt));
        log.info("Endpoint response: GET /api/events/mine, count={}", response.size());
        return response;
    }

    @GetMapping("/{id}")
    @Operation(operationId = "events_get")
    EventResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: GET /api/events/{}, userId={}", id, jwt.getSubject());
        var response = events.get(id, userId(jwt));
        log.info("Endpoint response: GET /api/events/{}, response={}", id, response);
        return response;
    }

    @PostMapping
    @Operation(operationId = "events_create")
    @ResponseStatus(HttpStatus.CREATED)
    EventResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody EventRequest request) {
        log.info("Endpoint called: POST /api/events, userId={}, request={}", jwt.getSubject(), request);
        var response = events.create(userId(jwt), request);
        log.info("Endpoint response: POST /api/events, response={}", response);
        return response;
    }

    @PutMapping("/{id}")
    @Operation(operationId = "events_update")
    EventResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                         @Valid @RequestBody EventRequest request) {
        log.info("Endpoint called: PUT /api/events/{}, userId={}, request={}", id, jwt.getSubject(), request);
        var response = events.update(id, userId(jwt), request);
        log.info("Endpoint response: PUT /api/events/{}, response={}", id, response);
        return response;
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
