package com.hackathon.app.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

	// Заголовок определяет имя файла схем у Orval (appAPI.schemas.ts) — не менять без нужды
	@Bean
	OpenAPI openApi() {
		return new OpenAPI().info(new Info().title("appAPI").version("v1"));
	}
}
