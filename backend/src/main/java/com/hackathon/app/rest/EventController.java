package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.dto.CreateEventRequest;
import com.hackathon.app.dto.DecideRegistrationRequest;
import com.hackathon.app.dto.EventRegistrationResponse;
import com.hackathon.app.dto.EventResponse;
import com.hackathon.app.dto.JoinEventRequest;
import com.hackathon.app.dto.ParticipantResponse;
import com.hackathon.app.dto.RegistrationResponse;
import com.hackathon.app.entity.Registration;
import com.hackathon.app.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "events")
@RestController
@RequestMapping(path = "/api/events", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class EventController {

    private final EventService events;

    @PostMapping
    @Operation(operationId = "events_create")
    @ResponseStatus(HttpStatus.CREATED)
    EventResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CreateEventRequest request) {
        log.info("Endpoint called: POST /api/events, userId={}, request={}", jwt.getSubject(), request);
        var response = events.create(userId(jwt), request);
        log.info("Endpoint response: POST /api/events, response={}", response);
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

    @GetMapping("/{id}/participants")
    @Operation(operationId = "events_participants")
    List<ParticipantResponse> participants(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: GET /api/events/{}/participants, userId={}", id, jwt.getSubject());
        var response = events.participants(id, userId(jwt));
        log.info("Endpoint response: GET /api/events/{}/participants, count={}, response={}", id, response.size(), response);
        return response;
    }

    @PostMapping("/{id}/join")
    @Operation(operationId = "events_join")
    @ResponseStatus(HttpStatus.CREATED)
    RegistrationResponse join(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                              @Valid @RequestBody(required = false) JoinEventRequest request) {
        log.info("Endpoint called: POST /api/events/{}/join, userId={}, request={}", id, jwt.getSubject(), request);
        var response = events.join(id, userId(jwt), request != null ? request.message() : null);
        log.info("Endpoint response: POST /api/events/{}/join, response={}", id, response);
        return response;
    }

    @PostMapping("/{id}/cancel")
    @Operation(operationId = "events_cancel")
    RegistrationResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: POST /api/events/{}/cancel, userId={}", id, jwt.getSubject());
        var response = events.cancel(id, userId(jwt));
        log.info("Endpoint response: POST /api/events/{}/cancel, response={}", id, response);
        return response;
    }

    @GetMapping("/{id}/registrations")
    @Operation(operationId = "events_registrations")
    List<EventRegistrationResponse> registrations(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                                  @RequestParam(required = false) Registration.Status status) {
        log.info("Endpoint called: GET /api/events/{}/registrations, userId={}, status={}", id, jwt.getSubject(), status);
        var response = events.registrations(id, userId(jwt), status);
        log.info("Endpoint response: GET /api/events/{}/registrations, count={}, response={}", id, response.size(), response);
        return response;
    }

    @PatchMapping("/{id}/registrations/{registrationId}")
    @Operation(operationId = "events_decide")
    RegistrationResponse decide(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID registrationId,
                                @Valid @RequestBody DecideRegistrationRequest request) {
        log.info("Endpoint called: PATCH /api/events/{}/registrations/{}, userId={}, request={}",
                id, registrationId, jwt.getSubject(), request);
        var response = events.decide(id, registrationId, userId(jwt), request.status());
        log.info("Endpoint response: PATCH /api/events/{}/registrations/{}, response={}", id, registrationId, response);
        return response;
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
