package com.hackathon.app.config;

import java.time.Duration;

import com.hackathon.app.util.AchievementImages;
import com.hackathon.app.util.SportImages;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Иллюстрации видов спорта, достижений и наград организаций раздаются как статика: картинка уходит прямо в {@code <img src>}, без контроллера. */
@Configuration
public class SportImagesConfig implements WebMvcConfigurer {

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		registry.addResourceHandler(SportImages.URL_PREFIX + "**")
				.addResourceLocations(SportImages.LOCATION)
				.setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
		registry.addResourceHandler(AchievementImages.URL_PREFIX + "**")
				.addResourceLocations(AchievementImages.LOCATION)
				.setCacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePublic());
	}
}
