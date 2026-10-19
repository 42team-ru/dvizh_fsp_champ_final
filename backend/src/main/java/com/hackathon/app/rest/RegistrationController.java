package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.dto.EventRegistrationResponse;
import com.hackathon.app.dto.MyRegistrationResponse;
import com.hackathon.app.dto.RegistrationRequest;
import com.hackathon.app.dto.RegistrationResponse;
import com.hackathon.app.dto.RejectRegistrationRequest;
import com.hackathon.app.entity.Registration;
import com.hackathon.app.service.RegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@Tag(name = "registrations")
@RestController
@RequestMapping(path = "/api", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class RegistrationController {

    private final RegistrationService registrations;

    @PostMapping("/events/{id}/registrations")
    @Operation(operationId = "registrations_create")
    @ResponseStatus(HttpStatus.CREATED)
    RegistrationResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                @Valid @RequestBody(required = false) RegistrationRequest request) {
        log.info("Endpoint called: POST /api/events/{}/registrations, userId={}, request={}", id, jwt.getSubject(), request);
        var response = registrations.create(id, userId(jwt), request != null ? request.message() : null);
        log.info("Endpoint response: POST /api/events/{}/registrations, response={}", id, response);
        return response;
    }

    @DeleteMapping("/events/{id}/registrations/me")
    @Operation(operationId = "registrations_cancel")
    RegistrationResponse cancel(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: DELETE /api/events/{}/registrations/me, userId={}", id, jwt.getSubject());
        var response = registrations.cancel(id, userId(jwt));
        log.info("Endpoint response: DELETE /api/events/{}/registrations/me, response={}", id, response);
        return response;
    }

    @GetMapping("/events/{id}/registrations")
    @Operation(operationId = "registrations_listForEvent")
    List<EventRegistrationResponse> listForEvent(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                                 @RequestParam(required = false) Registration.Status status) {
        log.info("Endpoint called: GET /api/events/{}/registrations, userId={}, status={}", id, jwt.getSubject(), status);
        var response = registrations.listForEvent(id, userId(jwt), status);
        log.info("Endpoint response: GET /api/events/{}/registrations, count={}, response={}", id, response.size(), response);
        return response;
    }

    @PostMapping("/registrations/{id}/approve")
    @Operation(operationId = "registrations_approve")
    RegistrationResponse approve(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
        log.info("Endpoint called: POST /api/registrations/{}/approve, userId={}", id, jwt.getSubject());
        var response = registrations.approve(id, userId(jwt));
        log.info("Endpoint response: POST /api/registrations/{}/approve, response={}", id, response);
        return response;
    }

    @PostMapping("/registrations/{id}/reject")
    @Operation(operationId = "registrations_reject")
    RegistrationResponse reject(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id,
                                @Valid @RequestBody(required = false) RejectRegistrationRequest request) {
        log.info("Endpoint called: POST /api/registrations/{}/reject, userId={}, request={}", id, jwt.getSubject(), request);
        var response = registrations.reject(id, userId(jwt), request != null ? request.reason() : null);
        log.info("Endpoint response: POST /api/registrations/{}/reject, response={}", id, response);
        return response;
    }

    @GetMapping("/registrations/mine")
    @Operation(operationId = "registrations_mine")
    List<MyRegistrationResponse> mine(@AuthenticationPrincipal Jwt jwt) {
        log.info("Endpoint called: GET /api/registrations/mine, userId={}", jwt.getSubject());
        var response = registrations.mine(userId(jwt));
        log.info("Endpoint response: GET /api/registrations/mine, count={}", response.size());
        return response;
    }

    private static UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }
}
