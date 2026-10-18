package com.hackathon.app.rest;

import java.time.Duration;

import com.hackathon.app.config.AuthProperties;
import com.hackathon.app.service.AuthSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** Единое место, где сессия превращается в cookie (и обратно очищается). */
@Component
@RequiredArgsConstructor
class AuthCookies {

	static final String ACCESS = "access_token";
	static final String REFRESH = "refresh_token";
	private static final String REFRESH_PATH = "/api/auth";

	private final AuthProperties props;

	void write(AuthSession s, HttpServletRequest req, HttpServletResponse res) {
		res.addHeader(HttpHeaders.SET_COOKIE, cookie(ACCESS, s.accessToken(), "/", props.accessTtl(), req).toString());
		res.addHeader(HttpHeaders.SET_COOKIE, cookie(REFRESH, s.refreshToken(), REFRESH_PATH, props.refreshTtl(), req).toString());
	}

	void clear(HttpServletRequest req, HttpServletResponse res) {
		res.addHeader(HttpHeaders.SET_COOKIE, cookie(ACCESS, "", "/", Duration.ZERO, req).toString());
		res.addHeader(HttpHeaders.SET_COOKIE, cookie(REFRESH, "", REFRESH_PATH, Duration.ZERO, req).toString());
	}

	// Secure ставится, когда запрос пришёл по HTTPS (за Caddy это видно по X-Forwarded-Proto); по голому HTTP браузер Secure-cookie отбросил бы
	private static ResponseCookie cookie(String name, String value, String path, Duration maxAge, HttpServletRequest req) {
		return ResponseCookie.from(name, value)
				.httpOnly(true)
				.secure(req.isSecure())
				.sameSite("Lax")
				.path(path)
				.maxAge(maxAge)
				.build();
	}
}
