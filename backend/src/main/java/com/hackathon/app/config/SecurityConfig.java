package com.hackathon.app.config;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * /api/** требует входа (JWT из cookie access_token или заголовка Authorization: Bearer),
 * кроме регистрации/логина/refresh/logout/проверок доступности, ping, swagger и health.
 */
@Configuration
public class SecurityConfig {

	/** Эти пути не читают токен вовсе: протухший cookie не должен ломать вход и обновление сессии. */
	private static final List<String> PUBLIC_AUTH = List.of("/api/auth/register", "/api/auth/login", "/api/auth/refresh",
			"/api/auth/logout", "/api/auth/users/check/");

	@Bean
	SecurityFilterChain filterChain(HttpSecurity http, BearerTokenResolver tokenResolver) {
		http
			.csrf(AbstractHttpConfigurer::disable) // cookie SameSite=Lax + JSON API
			.cors(Customizer.withDefaults())
			.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
			.authorizeHttpRequests(auth -> auth
				.requestMatchers("/api/auth/register", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout",
						"/api/auth/users/check/**", "/api/ping").permitAll()
				.requestMatchers("/actuator/health/**", "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
				.requestMatchers("/api/**").authenticated()
				.anyRequest().permitAll())
			.oauth2ResourceServer(rs -> rs
				.bearerTokenResolver(tokenResolver)
				.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
		return http.build();
	}

	@Bean
	BearerTokenResolver bearerTokenResolver() {
		var header = new DefaultBearerTokenResolver();
		return (HttpServletRequest request) -> {
			var path = request.getRequestURI();
			if (PUBLIC_AUTH.stream().anyMatch(path::startsWith)) {
				return null;
			}
			var fromHeader = header.resolve(request);
			if (fromHeader != null) {
				return fromHeader;
			}
			if (request.getCookies() != null) {
				for (Cookie c : request.getCookies()) {
					if ("access_token".equals(c.getName()) && !c.getValue().isBlank()) {
						return c.getValue();
					}
				}
			}
			return null;
		};
	}

	private JwtAuthenticationConverter jwtAuthenticationConverter() {
		var authorities = new JwtGrantedAuthoritiesConverter();
		authorities.setAuthoritiesClaimName("role");
		authorities.setAuthorityPrefix("ROLE_");
		var converter = new JwtAuthenticationConverter();
		converter.setJwtGrantedAuthoritiesConverter(authorities);
		return converter;
	}

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}

	@Bean
	JwtEncoder jwtEncoder(AuthProperties props) {
		return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey(props)));
	}

	@Bean
	JwtDecoder jwtDecoder(AuthProperties props) {
		return NimbusJwtDecoder.withSecretKey(secretKey(props)).macAlgorithm(MacAlgorithm.HS256).build();
	}

	private static SecretKey secretKey(AuthProperties props) {
		var bytes = props.jwtSecret().getBytes(StandardCharsets.UTF_8);
		if (bytes.length < 32) {
			throw new IllegalStateException("app.auth.jwt-secret (JWT_SECRET) должен быть не короче 32 символов");
		}
		return new SecretKeySpec(bytes, "HmacSHA256");
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(@Value("${app.cors-allowed-origins}") List<String> origins) {
		var cfg = new CorsConfiguration();
		if (origins.contains("*")) {
			cfg.setAllowedOriginPatterns(List.of("*")); // демо-режим: разрешить любой origin (вместе с cookie)
		}
		else {
			cfg.setAllowedOrigins(origins);
		}
		cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		cfg.setAllowedHeaders(List.of("*"));
		cfg.setAllowCredentials(true);
		var source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", cfg);
		return source;
	}
}
