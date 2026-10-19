package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.http.HttpStatus.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

import com.hackathon.app.TestcontainersConfiguration;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/** Сквозные проверки карты на настоящем PostGIS: вычисляемая точка и пространственный поиск. */
@Tag("postgres")
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EventMapE2ETest {
	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;
	private TestApi api;

	@BeforeEach
	void setUp() {
		api = new TestApi(mvc, json, users, passwords);
	}

	/**
	 * ФЛОУ: пользователь находит очные встречи в видимой области и выбирает нужный вид спорта.
	 * ШАГИ:
	 *   1. Зарегистрировать организатора и участника; создать две подходящие встречи разных видов спорта.
	 *   2. Записать участника на первую; создать встречи вне области, онлайн и позже конца периода;
	 *      ещё одну встречу в области админ снимает с публикации.
	 *   3. Запросить карту по области, уникальному названию и периоду; затем добавить фильтр sportId.
	 * ПРОВЕРЯЕМ: точный состав FeatureCollection, порядок координат [lon, lat], название, вид спорта,
	 *   число подтверждённых участников, limit=1000, truncated=false и сужение выдачи по виду спорта.
	 * ПОЧЕМУ ВАЖНО: неверная фильтрация показывает встречи в другом месте или времени, а перепутанные
	 *   координаты и счётчик участников делают маркеры и карточки карты недостоверными.
	 */
	@Test
	void mapShowsOnlyOfflineEventsInAreaAndPeriodAndFiltersBySport() throws Exception {
		// 1. Две встречи в области и периоде, у первой есть участник.
		var organizer = api.newUser("map");
		var participant = api.newUser("map");
		var marker = uniqueName("Карта ");
		var start = Instant.now().plus(2, ChronoUnit.DAYS);
		var from = start.minus(1, ChronoUnit.HOURS);
		var to = start.plus(1, ChronoUnit.HOURS);
		var firstForm = eventForm(marker + " бег", 92.8932, 56.0153, start);
		var first = organizer.createEvent(firstForm);
		var second = organizer.createEvent(eventForm(marker + " шахматы", 92.894, 56.016, start).sport("Шахматы"));
		participant.joinEvent(first.id());

		// 2. Контрольные встречи исключаются по месту, формату, времени и статусу.
		organizer.createEvent(eventForm(marker + " вне области", 93.2, 56.0153, start));
		organizer.createEvent(eventForm(marker + " онлайн", 92.8932, 56.0153, start)
				.with("format", "ONLINE").with("onlineUrl", "https://meet.example.com/map"));
		organizer.createEvent(eventForm(marker + " позже", 92.8932, 56.0153, to.plus(1, ChronoUnit.HOURS)));
		var unpublished = organizer.createEvent(eventForm(marker + " снято", 92.8932, 56.0153, start));
		api.newAdmin().unpublishEvent(unpublished.id(), "Площадка закрыта");

		// 3. Без фильтра спорта на карте ровно две встречи.
		var params = area(marker, "92.89", "56.01", "92.90", "56.02");
		params.put("from", from.toString());
		params.put("to", to.toString());
		var map = participant.map(params);
		assertThat(map.type()).isEqualTo("FeatureCollection");
		assertThat(map.features()).extracting(f -> f.id()).containsExactlyInAnyOrder(first.id(), second.id());
		assertThat(map.truncated()).isFalse();
		assertThat(map.limit()).isEqualTo(1000);

		// 4. Вид спорта сужает выдачу; DTO проверяет свойства, raw — форму GeoJSON.
		params.put("sportId", first.sport().id().toString());
		var filtered = participant.map(params);
		assertThat(filtered.features()).singleElement().satisfies(feature -> {
			assertThat(feature.id()).isEqualTo(first.id());
			assertThat(feature.properties().title()).isEqualTo(firstForm.get("title"));
			assertThat(feature.properties().sport().id()).isEqualTo(first.sport().id());
			assertThat(feature.properties().sport().name()).isEqualTo(first.sport().name());
			assertThat(feature.properties().participantsCount()).isEqualTo(1);
		});
		var request = get("/api/events/map");
		params.forEach(request::param);
		participant.raw(request).andExpect(status().isOk())
				.andExpect(jsonPath("$.type").value("FeatureCollection"))
				.andExpect(jsonPath("$.features[0].type").value("Feature"))
				.andExpect(jsonPath("$.features[0].geometry.type").value("Point"))
				.andExpect(jsonPath("$.features[0].geometry.coordinates", contains(92.8932, 56.0153)));
	}

	/**
	 * ФЛОУ: карта работает по обе стороны 180-го меридиана и отклоняет некорректные границы и формы.
	 * ШАГИ:
	 *   1. Создать очные встречи на долготах 179.9, -179.9 и 0 с уникальной частью названия.
	 *   2. Запросить область через 180-й меридиан без дат: получить только первые две точки.
	 *   3. Передать перевёрнутые широты, обратный период и запрос без области: получить 400.
	 *   4. Создать OFFLINE без координат и с одной координатой: получить 400; создать ONLINE с обеими.
	 * ПРОВЕРЯЕМ: оба прямоугольника области, исключение нулевой долготы, валидацию параметров,
	 *   сообщение «Отметьте место на карте» и null в lat/lon созданного онлайн-события.
	 * ПОЧЕМУ ВАЖНО: обычный прямоугольник теряет встречи у линии перемены дат; неверные границы
	 *   и сохранённые координаты онлайн-встреч дают пустую либо вводящую в заблуждение карту.
	 */
	@Test
	void mapCrossesAntimeridianAndRejectsInvalidBoundsAndCoordinates() {
		// 1. Область через 180-й меридиан включает обе стороны, исключая нулевую долготу.
		var actor = api.newUser("map");
		var marker = uniqueName("Меридиан ");
		var start = Instant.now().plus(2, ChronoUnit.DAYS);
		var east = actor.createEvent(eventForm(marker + " восток", 179.9, 12.345, start));
		var west = actor.createEvent(eventForm(marker + " запад", -179.9, 12.345, start));
		actor.createEvent(eventForm(marker + " ноль", 0, 12.345, start));
		var bounds = area(marker, "179.8", "12.34", "-179.8", "12.35");
		assertThat(actor.map(bounds).features()).extracting(f -> f.id()).containsExactlyInAnyOrder(east.id(), west.id());

		// 2. Перевёрнутые широты, период и отсутствие области отклоняются.
		assertThatApi(() -> actor.map(area(marker, "179.8", "12.35", "-179.8", "12.34"))).fails(BAD_REQUEST);
		bounds.put("from", start.toString());
		bounds.put("to", start.minusSeconds(1).toString());
		assertThatApi(() -> actor.map(bounds)).fails(BAD_REQUEST);
		assertThatApi(() -> actor.map(Map.of())).fails(BAD_REQUEST);

		// 3. Для OFFLINE обязательны обе координаты.
		var offline = EventForm.free().without("lat").without("lon");
		assertThatApi(() -> actor.createEvent(offline)).fails(BAD_REQUEST, "Отметьте место на карте");
		assertThatApi(() -> actor.createEvent(offline.with("lat", 56.0153))).fails(BAD_REQUEST);

		// 4. ONLINE принимает переданные координаты, но не сохраняет их.
		var online = actor.createEvent(EventForm.free().with("format", "ONLINE").with("onlineUrl", "https://meet.example.com/map"));
		assertThat(online.lat()).isNull();
		assertThat(online.lon()).isNull();
		var card = actor.openEvent(online.id());
		assertThat(card.lat()).isNull();
		assertThat(card.lon()).isNull();
	}

	private EventForm eventForm(String title, double lon, double lat, Instant start) {
		return EventForm.free().title(title).offline("Красноярск, спортивная площадка", lat, lon).startsAt(start);
	}

	private Map<String, String> area(String marker, String minLon, String minLat, String maxLon, String maxLat) {
		return new LinkedHashMap<>(Map.of("searchText", marker, "minLon", minLon, "minLat", minLat, "maxLon", maxLon, "maxLat", maxLat));
	}
}
