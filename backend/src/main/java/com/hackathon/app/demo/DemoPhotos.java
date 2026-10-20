package com.hackathon.app.demo;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.hackathon.app.domain.dto.FileUpload;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Настоящие фотографии для демо: обложки мероприятий, альбомы, блог, аватары и логотипы клубов.
 * <p>
 * Лежат в {@code resources/demo-photos}: папка на вид спорта ({@code football/1.jpg, 2.jpg, …} — нумерация подряд с
 * единицы, WebP — его готовит {@code scripts/demo_photos.py}; JPG и PNG тоже читаются), портреты в {@code avatars/women} и {@code avatars/men}, личные аватары главных
 * героев — {@code avatars/<логин>.jpg}. Каталог в jar не перечислить, поэтому файлы ищутся по номерам до первого
 * пропуска. Нет папки — нет фото: сид работает и без них (альбом и блог тогда берут иллюстрацию вида спорта).
 * Байты кешируются: одну фотографию загружают в десятки мероприятий.
 */
@Component
class DemoPhotos {

	private static final String ROOT = "demo-photos/";
	private static final List<String> EXTENSIONS = List.of(".webp", ".jpg", ".jpeg", ".png");
	private static final int MAX_PER_FOLDER = 60;

	/** Вид спорта → папка снимков. */
	private static final Map<String, String> FOLDERS = Map.ofEntries(
			Map.entry("Футбол", "football"), Map.entry("Бег", "running"), Map.entry("Волейбол", "volleyball"),
			Map.entry("Баскетбол", "basketball"), Map.entry("Велоспорт", "cycling"), Map.entry("Теннис", "tennis"),
			Map.entry("Настольный теннис", "tabletennis"), Map.entry("Плавание", "swimming"), Map.entry("Йога", "yoga"),
			Map.entry("Шахматы", "chess"), Map.entry("Шашки", "chess"), Map.entry("Скандинавская ходьба", "nordicwalking"),
			Map.entry("Зарядка", "exercise"), Map.entry("Падел", "padel"), Map.entry("Скалолазание", "climbing"),
			Map.entry("Бадминтон", "badminton"), Map.entry("Фрисби", "frisbee"), Map.entry("Воркаут", "workout"),
			Map.entry("Сапсёрфинг", "sup"), Map.entry("Хоккей", "hockey"), Map.entry("Петанк", "petanque"),
			Map.entry("Спортивное программирование", "coding"), Map.entry("Фитнес", "fitness"));

	private final Map<String, List<FileUpload>> folders = new ConcurrentHashMap<>();

	/** Фото вида спорта; пляжный волейбол (не в зале) — своя папка, если она есть. */
	List<FileUpload> sport(String sportName, boolean indoor) {
		if ("Волейбол".equals(sportName) && !indoor && !folder("beachvolleyball").isEmpty()) {
			return folder("beachvolleyball");
		}
		var name = FOLDERS.get(sportName);
		return name == null ? List.of() : folder(name);
	}

	List<FileUpload> sport(String sportName) {
		return sport(sportName, true);
	}

	/** count фото вида спорта подряд по кругу, начиная с from; меньше, если снимков меньше. */
	List<FileUpload> pick(String sportName, boolean indoor, int from, int count) {
		var all = sport(sportName, indoor);
		var result = new ArrayList<FileUpload>();
		for (int i = 0; i < Math.min(count, all.size()); i++) {
			result.add(all.get(Math.floorMod(from + i, all.size())));
		}
		return result;
	}

	/** n-е фото вида спорта по кругу; null — снимков нет. */
	FileUpload one(String sportName, int n) {
		var all = sport(sportName);
		return all.isEmpty() ? null : all.get(Math.floorMod(n, all.size()));
	}

	/** Портреты для аватаров массовки. */
	List<FileUpload> portraits(boolean female) {
		return folder(female ? "avatars/women" : "avatars/men");
	}

	/** Свой аватар главного героя ({@code avatars/<логин>.jpg}); null — нет. */
	FileUpload avatarOf(String username) {
		return load("avatars/" + username);
	}

	/** Любая папка {@code demo-photos/<name>}: 1, 2, 3… до первого пропуска. */
	List<FileUpload> folder(String name) {
		return folders.computeIfAbsent(name, n -> {
			var list = new ArrayList<FileUpload>();
			for (int i = 1; i <= MAX_PER_FOLDER; i++) {
				var file = load(n + "/" + i);
				if (file == null) {
					break;
				}
				list.add(file);
			}
			return List.copyOf(list);
		});
	}

	private static FileUpload load(String path) {
		for (var ext : EXTENSIONS) {
			var resource = new ClassPathResource(ROOT + path + ext);
			if (resource.exists()) {
				try (var in = resource.getInputStream()) {
					return new FileUpload(path.replace('/', '-') + ext, in.readAllBytes());
				}
				catch (IOException e) {
					throw new UncheckedIOException(e);
				}
			}
		}
		return null;
	}
}
