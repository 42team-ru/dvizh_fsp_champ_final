package com.hackathon.app.service;

import com.hackathon.app.config.AuthProperties;
import com.hackathon.app.dto.LoginRequest;
import com.hackathon.app.dto.RegisterRequest;
import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.RefreshToken;
import com.hackathon.app.exception.ConflictException;
import com.hackathon.app.exception.UnauthorizedException;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

	private static final String BAD_CREDENTIALS = "Неверное имя пользователя или пароль";
	private static final String BAD_SESSION = "Сессия недействительна, войдите заново";

	private final AppUserRepository users;
	private final RefreshTokenRepository refreshTokens;
	private final PasswordEncoder passwordEncoder;
	private final JwtEncoder jwtEncoder;
	private final AuthProperties props;
	private final DbTimeRepository dbTimeRepository;
	private final SecureRandom random = new SecureRandom();

	@Transactional
	public AppUser register(RegisterRequest r) {
		var username = r.username().trim();
		var email = r.email().trim().toLowerCase();
		if (users.existsByUsernameIgnoreCase(username)) {
			throw new ConflictException("Имя пользователя уже занято");
		}
		if (users.existsByEmailIgnoreCase(email)) {
			throw new ConflictException("Пользователь с таким email уже существует");
		}
		var user = new AppUser();
		user.setId(UUID.randomUUID());
		user.setUsername(username);
		user.setEmail(email);
		user.setPasswordHash(passwordEncoder.encode(r.password()));
		user.setFirstName(r.firstName().trim());
		user.setLastName(r.lastName().trim());
		user.setActive(true);
		user.setSystemRole(r.accountType() == RegisterRequest.AccountType.ORG
				? AppUser.SystemRole.ORG
				: AppUser.SystemRole.USER);
		user.setAuthProvider(AppUser.AuthProvider.LOCAL);
		user.setCreatedAt(dbTimeRepository.now());
		try {
			return users.saveAndFlush(user);
		}
		catch (DataIntegrityViolationException e) { // гонка двух параллельных регистраций
			throw new ConflictException("Имя пользователя или email уже заняты");
		}
	}

	@Transactional
	public AuthSession login(LoginRequest r) {
		var login = r.username().trim();
		var user = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(login, login).orElse(null);
		// Хэш считается и для несуществующего пользователя: одинаковое время ответа, нет перебора логинов
		var hash = user != null ? user.getPasswordHash() : passwordEncoder.encode("dummy-password");
		boolean ok = passwordEncoder.matches(r.password(), hash);
		if (user == null || !ok || !user.isActive()) {
			throw new UnauthorizedException(BAD_CREDENTIALS);
		}
		return newSession(user);
	}

	/** Ротация: старый refresh-токен гасится, выдаётся новый. Повторное предъявление погашенного = кража, гасим все. */
	@Transactional(noRollbackFor = UnauthorizedException.class)
	public AuthSession refresh(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			throw new UnauthorizedException(BAD_SESSION);
		}
		var token = refreshTokens.findByTokenHash(sha256(rawToken)).orElseThrow(() -> new UnauthorizedException(BAD_SESSION));
		var now = dbTimeRepository.now();
		if (token.getRevokedAt() != null) {
			refreshTokens.revokeAllForUser(token.getUserId(), now);
			throw new UnauthorizedException(BAD_SESSION);
		}
		if (token.getExpiresAt().isBefore(now)) {
			throw new UnauthorizedException(BAD_SESSION);
		}
		var user = users.findById(token.getUserId()).filter(AppUser::isActive).orElseThrow(() -> new UnauthorizedException(BAD_SESSION));
		token.setRevokedAt(now);
		return newSession(user);
	}

	@Transactional
	public void logout(String rawToken) {
		if (rawToken == null || rawToken.isBlank()) {
			return;
		}
		refreshTokens.findByTokenHash(sha256(rawToken)).ifPresent(t -> {
			if (t.getRevokedAt() == null) {
				t.setRevokedAt(dbTimeRepository.now());
			}
		});
	}

	@Transactional(readOnly = true)
	public AppUser me(UUID userId) {
		return users.findById(userId).filter(AppUser::isActive).orElseThrow(() -> new UnauthorizedException(BAD_SESSION));
	}

	@Transactional(readOnly = true)
	public boolean usernameAvailable(String username) {
		return !users.existsByUsernameIgnoreCase(username.trim());
	}

	@Transactional(readOnly = true)
	public boolean emailAvailable(String email) {
		return !users.existsByEmailIgnoreCase(email.trim());
	}

	private AuthSession newSession(AppUser user) {
		var now = dbTimeRepository.now();
		var raw = randomToken();
		var rt = new RefreshToken();
		rt.setId(UUID.randomUUID());
		rt.setUserId(user.getId());
		rt.setTokenHash(sha256(raw));
		rt.setCreatedAt(now);
		rt.setExpiresAt(now.plus(props.refreshTtl()));
		refreshTokens.save(rt);
		return new AuthSession(user, accessToken(user, now), raw);
	}

	private String accessToken(AppUser user, Instant now) {
		var claims = JwtClaimsSet.builder()
				.subject(user.getId().toString())
				.issuedAt(now)
				.expiresAt(now.plus(props.accessTtl()))
				.claim("role", user.getSystemRole().name())
				.build();
		var header = JwsHeader.with(MacAlgorithm.HS256).build();
		return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
	}

	private String randomToken() {
		var bytes = new byte[32];
		random.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static String sha256(String value) {
		try {
			return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
		}
		catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}
}
