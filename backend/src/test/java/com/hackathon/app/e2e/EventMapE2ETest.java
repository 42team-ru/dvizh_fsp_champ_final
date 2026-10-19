package com.hackathon.app.e2e;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import com.hackathon.app.TestcontainersConfiguration;
import com.hackathon.app.domain.enums.AccountType;
import com.hackathon.app.e2e.support.E2eSupport;
import com.hackathon.app.repository.AppUserRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

/** Сквозные проверки карты на настоящем PostGIS: вычисляемая точка и пространственный поиск. */
@Tag("postgres")
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
class EventMapE2ETest {

	@Autowired
	MockMvc mvc;
	@Autowired
	ObjectMapper json;
	@Autowired
	AppUserRepository users;
	@Autowired
	PasswordEncoder passwords;

	private E2eSupport support;

	@BeforeEach
	void setUp() {
		support = new E2eSupport(mvc, json, users, passwords);
	}

	/**
	 * ФЛОУ: пользователь находит очные встречи в видимой области и выбирает нужный вид спорта.
	 * ШАГИ:
	 *   1. Зарегистрировать организатора и участника; создать две подходящие встречи разных видов спорта.
	 *   2. Записать участника на первую; создать встречи вне области, онлайн и позже конца периода.
	 *   3. Запросить карту по области, уникальному названию и периоду; затем добавить фильтр sportId.
	 * ПРОВЕРЯЕМ: точный состав FeatureCollection, порядок координат [lon, lat], название, вид спорта,
	 *   число подтверждённых участников, limit=1000, truncated=false и сужение выдачи по виду спорта.
	 * ПОЧЕМУ ВАЖНО: неверная фильтрация показывает встречи в другом месте или времени, а перепутанные
	 *   координаты и счётчик участников делают маркеры и карточки карты недостоверными.
	 */
	@Test
	void mapShowsOnlyOfflineEventsInAreaAndPeriodAndFiltersBySport() throws Exception {
		// Создаём реальные аккаунты и изолируем события уникальной частью названия.
		var organizer = support.registerAndLogin(E2eSupport.uniqueName("map"), AccountType.USER);
		var participant = support.registerAndLogin(E2eSupport.uniqueName("map"), AccountType.USER);
		var marker = E2eSupport.uniqueName("Карта ");
		var start = Instant.now().plus(2, ChronoUnit.DAYS);
		var from = start.minus(1, ChronoUnit.HOURS);
		var to = start.plus(1, ChronoUnit.HOURS);
		var firstForm = eventForm(marker + " бег", 92.8932, 56.0153, start);
		var first = json.readTree(support.createEvent(organizer, firstForm)
				.andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
		var firstId = first.get("id").asText();
		var sportId = first.get("sport").get("id").asText();
		var sportName = first.get("sport").get("name").asText();
		var secondForm = eventForm(marker + " шахматы", 92.894, 56.016, start);
		secondForm.put("sportName", "Шахматы");
		var secondId = support.createdEventId(organizer, secondForm);
		support.registerForEvent(participant, firstId).andExpect(status().isCreated());

		// Контрольные встречи отличаются только причиной исключения из карты.
		support.createdEventId(organizer, eventForm(marker + " вне области", 93.2, 56.0153, start));
		var online = eventForm(marker + " онлайн", 92.8932, 56.0153, start);
		online.put("format", "ONLINE");
		online.put("onlineUrl", "https://meet.example.com/map");
		support.createdEventId(organizer, online);
		support.createdEventId(organizer, eventForm(marker + " позже", 92.8932, 56.0153,
				to.plus(1, ChronoUnit.HOURS)));

		// Без фильтра спорта остаются ровно две подходящие встречи.
		mvc.perform(area(participant, marker, "92.89", "56.01", "92.90", "56.02")
				.param("from", from.toString()).param("to", to.toString()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.type").value("FeatureCollection"))
				.andExpect(jsonPath("$.features", hasSize(2)))
				.andExpect(jsonPath("$.features[*].id", containsInAnyOrder(firstId, secondId)))
				.andExpect(jsonPath("$.truncated").value(false))
				.andExpect(jsonPath("$.limit").value(1000));

		// Фильтр сужает выдачу; проверяем геометрию и содержимое карточки маркера.
		mvc.perform(area(participant, marker, "92.89", "56.01", "92.90", "56.02")
				.param("from", from.toString()).param("to", to.toString()).param("sportId", sportId))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.features", hasSize(1)))
				.andExpect(jsonPath("$.features[0].id").value(firstId))
				.andExpect(jsonPath("$.features[0].type").value("Feature"))
				.andExpect(jsonPath("$.features[0].geometry.type").value("Point"))
				.andExpect(jsonPath("$.features[0].geometry.coordinates", contains(92.8932, 56.0153)))
				.andExpect(jsonPath("$.features[0].properties.title").value(firstForm.get("title")))
				.andExpect(jsonPath("$.features[0].properties.sport.id").value(sportId))
				.andExpect(jsonPath("$.features[0].properties.sport.name").value(sportName))
				.andExpect(jsonPath("$.features[0].properties.participantsCount").value(1));
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
	void mapCrossesAntimeridianAndRejectsInvalidBoundsAndCoordinates() throws Exception {
		// Точки по обе стороны меридиана попадают в одну область с minLon > maxLon.
		var access = support.registerAndLogin(E2eSupport.uniqueName("map"), AccountType.USER);
		var marker = E2eSupport.uniqueName("Меридиан ");
		var start = Instant.now().plus(2, ChronoUnit.DAYS);
		var eastId = support.createdEventId(access, eventForm(marker + " восток", 179.9, 12.345, start));
		var westId = support.createdEventId(access, eventForm(marker + " запад", -179.9, 12.345, start));
		support.createdEventId(access, eventForm(marker + " ноль", 0, 12.345, start));
		mvc.perform(area(access, marker, "179.8", "12.34", "-179.8", "12.35"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.features", hasSize(2)))
				.andExpect(jsonPath("$.features[*].id", containsInAnyOrder(eastId, westId)));

		// Невалидные область и период отклоняются до пространственного поиска.
		mvc.perform(area(access, marker, "179.8", "12.35", "-179.8", "12.34"))
				.andExpect(status().isBadRequest());
		mvc.perform(area(access, marker, "179.8", "12.34", "-179.8", "12.35")
				.param("from", start.toString()).param("to", start.minusSeconds(1).toString()))
				.andExpect(status().isBadRequest());
		mvc.perform(get("/api/events/map").cookie(access)).andExpect(status().isBadRequest());

		// Очной встрече нужна полная пара координат.
		var offline = support.eventForm();
		offline.remove("lat");
		offline.remove("lon");
		support.createEvent(access, offline).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("Отметьте место на карте"));
		offline.put("lat", 56.0153);
		support.createEvent(access, offline).andExpect(status().isBadRequest());

		// Онлайн-встреча принимается, но переданные координаты не сохраняются.
		var online = support.eventForm();
		online.put("format", "ONLINE");
		online.put("onlineUrl", "https://meet.example.com/map");
		var onlineId = support.responseId(support.createEvent(access, online)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.lat").value(nullValue()))
				.andExpect(jsonPath("$.lon").value(nullValue())));
		mvc.perform(get("/api/events/{id}", onlineId).cookie(access))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.lat").value(nullValue()))
				.andExpect(jsonPath("$.lon").value(nullValue()));
	}

	private Map<String, Object> eventForm(String title, double lon, double lat, Instant start) {
		var form = support.eventForm();
		form.put("title", title);
		form.put("lon", lon);
		form.put("lat", lat);
		form.put("startAt", start.toString());
		return form;
	}

	private MockHttpServletRequestBuilder area(Cookie access, String marker,
			String minLon, String minLat, String maxLon, String maxLat) {
		return get("/api/events/map").cookie(access).param("searchText", marker)
				.param("minLon", minLon).param("minLat", minLat)
				.param("maxLon", maxLon).param("maxLat", maxLat);
	}
}
