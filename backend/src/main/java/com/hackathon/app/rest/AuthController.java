package com.hackathon.app.rest;

import java.util.UUID;

import com.hackathon.app.dto.AvailabilityCheckResponse;
import com.hackathon.app.dto.LoginRequest;
import com.hackathon.app.dto.MeResponse;
import com.hackathon.app.dto.RegisterRequest;
import com.hackathon.app.dto.UserResponse;
import com.hackathon.app.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Сессия живёт в двух HttpOnly cookie: access_token (JWT, короткий) и refresh_token (случайная строка, ротируется).
 * JS токены не видит, поэтому XSS их не украдёт; SameSite=Lax защищает от CSRF.
 */
@Tag(name = "auth")
@RestController
@RequestMapping(path = "/api/auth", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class AuthController {

	private final AuthService auth;
	private final AuthCookies cookies;

	@PostMapping("/register")
	@Operation(operationId = "auth_register")
	@ResponseStatus(HttpStatus.CREATED)
	UserResponse register(@Valid @RequestBody RegisterRequest request) {
		return UserResponse.of(auth.register(request));
	}

	@PostMapping("/login")
	@Operation(operationId = "auth_login")
	UserResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest req, HttpServletResponse res) {
		var session = auth.login(request);
		cookies.write(session, req, res);
		return UserResponse.of(session.user());
	}

	@PostMapping("/refresh")
	@Operation(operationId = "auth_refresh")
	UserResponse refresh(@CookieValue(name = AuthCookies.REFRESH, required = false) String refreshToken,
			HttpServletRequest req, HttpServletResponse res) {
		var session = auth.refresh(refreshToken);
		cookies.write(session, req, res);
		return UserResponse.of(session.user());
	}

	@PostMapping("/logout")
	@Operation(operationId = "auth_logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void logout(@CookieValue(name = AuthCookies.REFRESH, required = false) String refreshToken,
			HttpServletRequest req, HttpServletResponse res) {
		auth.logout(refreshToken);
		cookies.clear(req, res);
	}

	@GetMapping("/me")
	@Operation(operationId = "auth_me")
	MeResponse me(@AuthenticationPrincipal Jwt jwt) {
		return MeResponse.of(auth.me(UUID.fromString(jwt.getSubject())));
	}

	@GetMapping("/users/check/username")
	@Operation(operationId = "auth_checkUsername")
	AvailabilityCheckResponse checkUsername(@RequestParam String username) {
		return new AvailabilityCheckResponse(auth.usernameAvailable(username));
	}

	@GetMapping("/users/check/email")
	@Operation(operationId = "auth_checkEmail")
	AvailabilityCheckResponse checkEmail(@RequestParam String email) {
		return new AvailabilityCheckResponse(auth.emailAvailable(email));
	}
}
