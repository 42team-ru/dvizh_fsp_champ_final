package com.hackathon.app.demo;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.service.AlbumService;
import com.hackathon.app.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Фото в профилях, как их добавил бы человек: альбом — с прошедших встреч, куда он ходил или которые провёл
 * ({@link AlbumService#add}), и несколько личных фото «Обо мне». Снимки — настоящие фотографии вида спорта встречи
 * ({@link DemoPhotos}); если их не положили, — иллюстрация вида спорта.
 */
@Component
@RequiredArgsConstructor
class DemoAlbumSeeder {

	private static final List<String> CAPTIONS = List.of("Финиш у моста", "Все в сборе", "Разминка перед стартом",
			"Бублик одобряет", "Закат над Енисеем", "Круг почёта", "Старт", "После игры", "Наша команда",
			"Самый красивый момент вечера", "Первый раз — и сразу в кадр", "Устали, но довольны");

	private final AlbumService album;
	private final UserProfileService profiles;
	private final DemoPhotos photos;

	void seed(DemoCast cast) {
		fill(cast.id("anna"), 6, 3, 0);
		fill(cast.id("petr"), 5, 3, 7);
		fill(cast.id("vika"), 8, 2, 13);
		fill(cast.id("elena"), 3, 2, 21);
		fill(cast.id("olga"), 3, 2, 29);
		fill(cast.id("dmitry"), 3, 2, 35);
		about(cast.id("anna"), "Бег", "Йога", "Петанк");
		about(cast.id("petr"), "Шахматы", "Баскетбол");
		about(cast.id("vika"), "Бег", "Волейбол", "Бадминтон", "Йога");
		about(cast.id("olga"), "Зарядка", "Скандинавская ходьба");
		about(cast.id("elena"), "Бег", "Бег");
	}

	/** До folders папок, в каждой от 1 до maxPerFolder фото; подпись есть не у всех. shift разводит снимки людей. */
	private void fill(UUID userId, int folders, int maxPerFolder, int shift) {
		var events = album.eligibleEvents(userId).stream().limit(folders).toList();
		int n = shift;
		for (int i = 0; i < events.size(); i++) {
			var event = events.get(i);
			for (int j = 0; j < 1 + (maxPerFolder - 1 + i) % maxPerFolder; j++, n++) {
				var caption = n % 3 == 2 ? null : CAPTIONS.get(n % CAPTIONS.size());
				album.add(userId, event.id(), caption, photo(event.sport().name(), event.sport().slug(), n));
			}
		}
	}

	private void about(UUID userId, String... sports) {
		int n = userId.hashCode();
		for (var sport : sports) {
			profiles.addPhoto(userId, photo(sport, null, n++));
		}
	}

	/** Настоящее фото вида спорта, иначе — иллюстрация по slug. */
	private FileUpload photo(String sportName, String slug, int n) {
		var real = photos.one(sportName, n);
		return real != null ? real : image(slug == null ? "default" : slug);
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
