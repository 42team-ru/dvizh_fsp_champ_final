package com.hackathon.app.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI.
 */
@Configuration
public class OpenApiConfig {

	private static final String COOKIE = "cookieAuth";
	private static final String BEARER = "bearerAuth";

	// Заголовок определяет имя файла схем у Orval (appAPI.schemas.ts) — не менять без нужды
	@Bean
	OpenAPI openApi() {
		return new OpenAPI()
				.info(new Info().title("appAPI").version("v1")
						.description("Платформа совместных спортивных активностей. Ошибки — ProblemDetail (RFC 9457), "
								+ "текст для человека в поле detail."))
				.components(new Components()
						.addSecuritySchemes(COOKIE, new SecurityScheme().type(SecurityScheme.Type.APIKEY)
								.in(SecurityScheme.In.COOKIE).name("access_token")
								.description("Ставится при POST /api/auth/login"))
						.addSecuritySchemes(BEARER, new SecurityScheme().type(SecurityScheme.Type.HTTP)
								.scheme("bearer").bearerFormat("JWT")))
				.addSecurityItem(new SecurityRequirement().addList(COOKIE))
				.addSecurityItem(new SecurityRequirement().addList(BEARER));
	}
}
