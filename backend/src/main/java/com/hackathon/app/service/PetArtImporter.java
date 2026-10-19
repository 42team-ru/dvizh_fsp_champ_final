package com.hackathon.app.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import com.hackathon.app.config.PetImportProperties;
import com.hackathon.app.domain.dto.PetArtPreviewResponse;
import com.hackathon.app.domain.dto.PetArtResponse;
import com.hackathon.app.domain.enums.PetBodyPart;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ServiceUnavailableException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * PNG или SVG → вещь бобра. Разбор, векторизацию и посадку на тело делает pet_item_import.py (ресурс pet-import/),
 * здесь — запуск процесса и повторная проверка результата: в страницу попадёт только разметка из одних {@code <path>}
 * с известными атрибутами, даже если скрипт ошибётся.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PetArtImporter {

	private static final String SCRIPT = "pet-import/pet_item_import.py";
	/** Код выхода скрипта, когда причина понятна админу (текст в stderr). */
	private static final int USER_ERROR = 2;
	private static final int MAX_SVG_LENGTH = 400_000;

	/** Подряд идущие {@code <path .../>}, ничего между ними. */
	private static final Pattern PATH = Pattern.compile("\\G<path((?: [a-z-]+=\"[^\"<>&]*\")+)/>");
	private static final Pattern ATTRIBUTE = Pattern.compile(" ([a-z-]+)=\"([^\"]*)\"");
	private static final Pattern NUMBER = Pattern.compile("\\d+(\\.\\d+)?");
	private static final Pattern COLOR = Pattern.compile("#[0-9A-F]{6}");
	private static final Map<String, Pattern> ALLOWED = Map.of(
			"d", Pattern.compile("[MLHVCSQTAZmlhvcsqtaz0-9.,\\s-]+"),
			"fill", Pattern.compile("#[0-9A-F]{6}|none"),
			"fill-opacity", NUMBER,
			"fill-rule", Pattern.compile("evenodd"),
			"stroke", COLOR,
			"stroke-width", NUMBER,
			"stroke-opacity", NUMBER,
			"stroke-linejoin", Pattern.compile("round"),
			"stroke-linecap", Pattern.compile("round"));

	private final PetImportProperties properties;
	private final JsonMapper json;
	private Path script;

	/** Что печатает скрипт. */
	private record ScriptResult(String svg, double width, double height, double x, double y, double scale, int paths) {
	}

	/** Разобрать картинку и посадить на часть тела. Непонятный файл — 400 с причиной, нет Python — 503. */
	public PetArtPreviewResponse parse(PetBodyPart part, byte[] content) {
		if (content == null || content.length == 0) {
			throw new BadRequestException("Выберите файл PNG или SVG");
		}
		Path input = null;
		Path output = null;
		Path errors = null;
		try {
			input = Files.createTempFile("pet-item-", ".bin");
			output = Files.createTempFile("pet-item-", ".json");
			errors = Files.createTempFile("pet-item-", ".txt");
			Files.write(input, content);
			// -I: изолированный режим, скрипт не подхватит модули из текущей папки и переменных окружения
			var process = new ProcessBuilder(List.of(properties.python(), "-I", script().toString(),
					"--part", part.name(), "--input", input.toString()))
					.redirectOutput(output.toFile()).redirectError(errors.toFile()).start();
			if (!process.waitFor(properties.timeout().toMillis(), TimeUnit.MILLISECONDS)) {
				process.destroyForcibly();
				throw new BadRequestException("Картинка разбирается слишком долго: упростите её или уменьшите");
			}
			var stderr = Files.readString(errors, StandardCharsets.UTF_8).strip();
			if (process.exitValue() == USER_ERROR) {
				throw new BadRequestException(stderr);
			}
			if (process.exitValue() != 0) {
				log.error("Pet import script failed: exit={}, stderr={}", process.exitValue(), stderr);
				throw new ServiceUnavailableException("Не удалось разобрать картинку: ошибка импорта на сервере", null);
			}
			var result = json.readValue(Files.readString(output, StandardCharsets.UTF_8), ScriptResult.class);
			check(result.svg());
			log.info("Pet art parsed: part={}, bytes={}, paths={}, fit=({}, {}, {})", part, content.length,
					result.paths(), result.x(), result.y(), result.scale());
			return new PetArtPreviewResponse(new PetArtResponse(part, result.svg(), result.x(), result.y(), result.scale()),
					result.width(), result.height(), result.paths());
		}
		catch (IOException e) {
			log.error("Pet import unavailable: python={}", properties.python(), e);
			throw new ServiceUnavailableException(
					"Импорт картинок недоступен: на сервере не настроен Python (app.pet-import.python)", e);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			throw new ServiceUnavailableException("Разбор картинки прерван", e);
		}
		finally {
			deleteQuietly(input);
			deleteQuietly(output);
			deleteQuietly(errors);
		}
	}

	/** Разметка — только {@code <path>} с разрешёнными атрибутами и значениями, иначе это ошибка скрипта. */
	static void check(String svg) {
		if (svg == null || svg.isEmpty() || svg.length() > MAX_SVG_LENGTH) {
			throw new IllegalStateException("Pet import returned empty or oversized svg");
		}
		var paths = PATH.matcher(svg);
		var end = 0;
		while (paths.find()) {
			var attributes = ATTRIBUTE.matcher(paths.group(1));
			while (attributes.find()) {
				var allowed = ALLOWED.get(attributes.group(1));
				if (allowed == null || !allowed.matcher(attributes.group(2)).matches()) {
					throw new IllegalStateException("Pet import returned forbidden attribute: " + attributes.group(1));
				}
			}
			end = paths.end();
		}
		if (end != svg.length()) {
			throw new IllegalStateException("Pet import returned markup other than <path>");
		}
	}

	/** Скрипт лежит в jar: при первом вызове копируем во временный файл, чтобы его мог запустить Python. */
	private synchronized Path script() throws IOException {
		if (script == null) {
			var file = Files.createTempFile("pet_item_import-", ".py");
			try (InputStream source = new ClassPathResource(SCRIPT).getInputStream()) {
				Files.copy(source, file, StandardCopyOption.REPLACE_EXISTING);
			}
			file.toFile().deleteOnExit();
			script = file;
		}
		return script;
	}

	private static void deleteQuietly(Path file) {
		if (file == null) {
			return;
		}
		try {
			Files.deleteIfExists(file);
		}
		catch (IOException e) {
			log.warn("Temp file left: {}", file, e);
		}
	}
}
