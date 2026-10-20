package com.hackathon.app.demo;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.hackathon.app.domain.dto.FileUpload;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Настоящие фотографии для демо: обложки мероприятий, альбомы, блог, аватары и логотипы клубов.
 * <p>
 * Лежат в {@code resources/demo-photos}: папка на вид спорта ({@code football/1.webp, 2.webp, …} — нумерация подряд с
 * единицы; готовит {@code scripts/demo_photos.py}), портреты в {@code avatars/women} и {@code avatars/men}, аватары
 * главных героев — {@code avatars/<логин>.webp}, командные фото для логотипов организаций — {@code clubs/}. Каталог в jar не перечислить, поэтому файлы ищутся по номерам до
 * первого пропуска. Нет папки — нет фото: сид работает и без них.
 * <p>
 * <b>Каждый снимок выдаётся один раз</b>: одна фотография не окажется у двух мероприятий, в двух альбомах или в посте
 * и на обложке. Первые две трети папки — витрина (основные мероприятия, гайды, альбомы, логотипы), последняя треть —
 * массовка. Кончились снимки — вызывающий обходится без фото.
 */
@Component
class DemoPhotos {

	private static final String ROOT = "demo-photos/";
	private static final List<String> EXTENSIONS = List.of(".webp", ".jpg", ".jpeg", ".png");
	private static final int MAX_PER_FOLDER = 80;

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

	/** Виды, клубам которых подходит командное фото на логотипе. */
	private static final Set<String> TEAM_SPORTS = Set.of("Футбол", "Баскетбол", "Волейбол", "Бег",
			"Хоккей");

	/** Снимки папки: сколько выдано из витрины и из массовки, сколько обещано массовке заранее. */
	private static final class Pool {
		final List<FileUpload> files;
		final int featuredSize;
		int featuredUsed;
		int bulkUsed;
		int reserved;

		Pool(List<FileUpload> files) {
			this.files = files;
			this.featuredSize = (files.size() * 2 + 2) / 3;
		}

		int bulkSize() {
			return files.size() - featuredSize;
		}
	}

	private final Map<String, Pool> pools = new HashMap<>();
	private final Map<String, List<FileUpload>> folders = new HashMap<>();
	private int clubsUsed;

	/** До count ещё не выданных снимков витрины: основные мероприятия, гайды, альбомы, логотипы. */
	synchronized List<FileUpload> featured(String sportName, boolean indoor, int count) {
		var pool = pool(sportName, indoor);
		var result = new ArrayList<FileUpload>();
		while (pool != null && result.size() < count && pool.featuredUsed < pool.featuredSize) {
			result.add(pool.files.get(pool.featuredUsed++));
		}
		return result;
	}

	/** Один снимок витрины; null — кончились. */
	FileUpload featuredOne(String sportName) {
		var list = featured(sportName, true, 1);
		return list.isEmpty() ? null : list.getFirst();
	}

	/**
	 * Пообещать мероприятию массовки до count снимков. Решается при планировании, чтобы фото достались встречам
	 * вперемешку, а не только самым ранним по времени. Возвращает, сколько обещано.
	 */
	synchronized int reserveBulk(String sportName, boolean indoor, int count) {
		var pool = pool(sportName, indoor);
		if (pool == null) {
			return 0;
		}
		int granted = Math.max(0, Math.min(count, pool.bulkSize() - pool.reserved));
		pool.reserved += granted;
		return granted;
	}

	/** Обещанные снимки массовки: следующие count из её половины папки. */
	synchronized List<FileUpload> bulk(String sportName, boolean indoor, int count) {
		var pool = pool(sportName, indoor);
		var result = new ArrayList<FileUpload>();
		while (pool != null && result.size() < count && pool.bulkUsed < pool.bulkSize()) {
			result.add(pool.files.get(pool.featuredSize + pool.bulkUsed++));
		}
		return result;
	}

	/**
	 * Логотип организации: у командных видов — командное фото из {@code clubs/} (каждое — одному клубу; у шахматного
	 * клуба футболистов на логотипе быть не должно), у остальных и когда фото кончились —
	 * снимок витрины её вида спорта. null — нет ни того, ни другого.
	 */
	synchronized FileUpload clubLogo(String sportName) {
		var clubs = folder("clubs");
		if (TEAM_SPORTS.contains(sportName) && clubsUsed < clubs.size()) {
			return clubs.get(clubsUsed++);
		}
		return featuredOne(sportName);
	}

	/** Портреты для аватаров массовки. */
	List<FileUpload> portraits(boolean female) {
		return folder(female ? "avatars/women" : "avatars/men");
	}

	/** Свой аватар главного героя ({@code avatars/<логин>.webp}); null — нет. */
	FileUpload avatarOf(String username) {
		return load("avatars/" + username);
	}

	/** Пляжный волейбол (не в зале) — своя папка, если она есть. */
	private Pool pool(String sportName, boolean indoor) {
		var name = "Волейбол".equals(sportName) && !indoor && !folder("beachvolleyball").isEmpty()
				? "beachvolleyball" : FOLDERS.get(sportName);
		if (name == null) {
			return null;
		}
		var pool = pools.computeIfAbsent(name, n -> new Pool(folder(n)));
		return pool.files.isEmpty() ? null : pool;
	}

	/** Папка {@code demo-photos/<name>}: 1, 2, 3… до первого пропуска. */
	private synchronized List<FileUpload> folder(String name) {
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
