package com.hackathon.app.demo;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.AlbumEventResponse;
import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.service.AlbumService;
import com.hackathon.app.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Фото в профилях, как их добавил бы человек: альбом — с прошедших встреч, куда он ходил или которые провёл
 * ({@link AlbumService#add}), и несколько личных фото «Обо мне». Снимками служат иллюстрации видов спорта.
 */
@Component
@RequiredArgsConstructor
class DemoAlbumSeeder {

	private static final List<String> CAPTIONS = List.of("Финиш у моста", "Все в сборе", "Разминка", "Бублик одобряет",
			"Закат над Енисеем", "Круг почёта", "Старт", "После игры");

	private final AlbumService album;
	private final UserProfileService profiles;

	void seed(DemoCast cast) {
		fill(cast.id("anna"), 6, 3);
		fill(cast.id("petr"), 4, 2);
		about(cast.id("anna"), "running", "fitness", "dance");
		about(cast.id("petr"), "chess");
	}

	/** До folders папок, в каждой от 1 до maxPerFolder фото; подпись есть не у всех. */
	private void fill(UUID userId, int folders, int maxPerFolder) {
		var events = album.eligibleEvents(userId).stream().limit(folders).toList();
		int n = 0;
		for (int i = 0; i < events.size(); i++) {
			var event = events.get(i);
			for (int j = 0; j < 1 + (maxPerFolder - 1 + i) % maxPerFolder; j++, n++) {
				var caption = n % 3 == 2 ? null : CAPTIONS.get(n % CAPTIONS.size());
				album.add(userId, event.id(), caption, image(slug(event)));
			}
		}
	}

	private void about(UUID userId, String... slugs) {
		for (var slug : slugs) {
			profiles.addPhoto(userId, image(slug));
		}
	}

	private static String slug(AlbumEventResponse event) {
		return event.sport().slug();
	}

	static FileUpload image(String slug) {
		var resource = new ClassPathResource("sport-images/" + slug + ".webp");
		if (!resource.exists()) {
			resource = new ClassPathResource("sport-images/default.webp");
		}
		try (var in = resource.getInputStream()) {
			return new FileUpload(slug + ".webp", in.readAllBytes());
		}
		catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}
}
