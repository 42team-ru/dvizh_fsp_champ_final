package com.hackathon.app.e2e;

import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.dto.HelpersPreferences;
import com.hackathon.app.domain.dto.HomePoint;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.dto.RecommendationExplainResponse;
import com.hackathon.app.domain.dto.RecommendationFeature;
import com.hackathon.app.domain.dto.RecommendationReason;
import com.hackathon.app.domain.dto.RecommendedEventResponse;
import com.hackathon.app.domain.dto.SaveUserPreferencesRequest;
import com.hackathon.app.domain.dto.SaveUserSportsRequest;
import com.hackathon.app.domain.dto.UserSportRequest;
import com.hackathon.app.domain.enums.Daytime;
import com.hackathon.app.domain.enums.RecommendationFeatureCode;
import com.hackathon.app.domain.enums.RecommendationReasonCode;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.e2e.support.Actor;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.OrganizationForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.EventOccurrenceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/**
 * Персональная подборка мероприятий и клубов. База общая для всех тестов, поэтому каждый тест заводит свои
 * уникальные виды спорта и сравнивает свои мероприятия между собой, а не с чужими.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class RecommendationsE2ETest {

	/** Центр Красноярска: здесь по умолчанию проходят мероприятия EventForm. */
	private static final HomePoint HOME = new HomePoint(56.0153, 92.8932);

	@Autowired MockMvc mvc;
	@Autowired ObjectMapper json;
	@Autowired AppUserRepository users;
	@Autowired PasswordEncoder passwords;
	@Autowired EventOccurrenceRepository occurrences;
	private TestApi api;

	@BeforeEach
	void setUp() {
		api = new TestApi(mvc, json, users, passwords);
	}

	/**
	 * ФЛОУ: человек с любимым видом спорта и домашней точкой открывает подборку и скрывает то, что не подошло.
	 * ШАГИ:
	 *   1. Фанат сохраняет вид спорта и предпочтения с домом (радиус 5 км); домашняя точка возвращается в GET.
	 *   2. Автор создаёт два мероприятия этого вида рядом, одно — за 30 км, одно другого вида рядом;
	 *      фанат создаёт своё и записывается на ещё одно.
	 *   3. Подборка по виду: рядом — есть, с причинами «ваш вид» и «рядом»; далёкое, своё и записанное — нет,
	 *      а разбор оценки объясняет почему. Свой вид оценён выше чужого при прочих равных.
	 *   4. «Не мой вид спорта» на одном: оно уходит, у второго того же вида оценка вдвое ниже.
	 *   5. «Вернуть» — всё как было.
	 * ПРОВЕРЯЕМ: состав подборки, причины, расстояние, excludedReason, множитель скрытий, home в предпочтениях.
	 * ПОЧЕМУ ВАЖНО: подборка должна советовать то, куда человек реально может пойти, объяснять выбор и слушаться
	 *   «Не интересно» — иначе ей не доверяют.
	 */
	@Test
	void personalFeedRanksExplainsAndListensToDismiss() {
		// 1. Профиль и дом.
		var author = api.newUser("recAuthor");
		var fan = api.newUser("recFan");
		var sportId = fan.saveMySports(new SaveUserSportsRequest(List.of(
				new UserSportRequest(null, TestApi.uniqueName("Футбол "), SportLevel.AMATEUR)))).getFirst().sport().id();
		var saved = fan.saveMyPreferences(new SaveUserPreferencesRequest(SportLevel.AMATEUR, List.of(DayOfWeek.values()),
				Daytime.EVENING, 5, new HelpersPreferences(true, true, false), HOME));
		assertThat(saved.home()).isEqualTo(HOME);
		assertThat(fan.myPreferences().home()).isEqualTo(HOME);

		// 2. Мероприятия.
		var near = author.createEvent(EventForm.free().sportId(sportId)).id();
		var nearSecond = author.createEvent(EventForm.free().sportId(sportId)).id();
		var far = author.createEvent(EventForm.free().sportId(sportId).offline("Дивногорск, стадион", 55.958, 92.38)).id();
		var otherSport = author.createEvent(EventForm.free().sport(TestApi.uniqueName("Сквош "))).id();
		var own = fan.createEvent(EventForm.free().sportId(sportId)).id();
		var joined = author.createEvent(EventForm.free().sportId(sportId)).id();
		fan.joinEvent(joined);

		// 3. Подборка по виду спорта и разбор оценок.
		var bySport = Map.of("sportId", sportId.toString(), "size", "50");
		var page = fan.recommendedEvents(bySport);
		assertThat(ids(page)).contains(near, nearSecond).doesNotContain(far, own, joined);
		var card = item(page, near);
		assertThat(codes(card.reasons())).contains(RecommendationReasonCode.YOUR_SPORT, RecommendationReasonCode.NEARBY);
		assertThat(card.distanceKm()).isLessThan(1.0);
		assertThat(card.score()).isBetween(0.0, 1.0);
		assertThat(fan.explainRecommendation(far).excludedReason()).startsWith("Слишком далеко");
		assertThat(fan.explainRecommendation(own).excludedReason()).isEqualTo("Вы организатор этого мероприятия");
		assertThat(fan.explainRecommendation(joined).excludedReason()).isEqualTo("Вы уже записаны");
		var nearExplain = fan.explainRecommendation(near);
		assertThat(nearExplain.eligible()).isTrue();
		assertThat(feature(nearExplain, RecommendationFeatureCode.SPORT).value()).isEqualTo(1.0);
		assertThat(nearExplain.score()).isGreaterThan(fan.explainRecommendation(otherSport).score());

		// 4. «Не мой вид спорта».
		fan.dismissRecommendation(near, "NOT_MY_SPORT");
		assertThat(ids(fan.recommendedEvents(bySport))).doesNotContain(near).contains(nearSecond);
		assertThat(fan.explainRecommendation(near).excludedReason()).isEqualTo("Вы скрыли его из подборки");
		// близнец скрытого (тот же вид, автор, время, место): штраф упирается в пол app.recommendations.dismiss.floor
		assertThat(fan.explainRecommendation(nearSecond).dismissPenalty()).isCloseTo(0.35, within(0.01));
		fan.dismissRecommendation(near, "NOT_MY_SPORT"); // повтор не создаёт дубль и не падает

		// 5. «Вернуть».
		fan.undismissRecommendation(near);
		fan.undismissRecommendation(near); // повторно — ничего не происходит
		assertThat(ids(fan.recommendedEvents(bySport))).contains(near, nearSecond);
		assertThat(fan.explainRecommendation(nearSecond).dismissPenalty()).isEqualTo(1.0);
	}

	/**
	 * ФЛОУ: границы и права подборки, а также новичок без профиля.
	 * ШАГИ:
	 *   1. Широта без долготы — 400; без входа — 401; «Не интересно» несуществующему — 404.
	 *   2. Аккаунт организации получает пустую подборку.
	 *   3. Новичок без интересов и предпочтений: мероприятия одного вида для новичков и для профи.
	 * ПРОВЕРЯЕМ: тексты ошибок; пустая страница для ORG; при холодном старте подборка не пустая, вид спорта
	 *   не учитывается (вес 0), «для новичков» выше профи, у профи множитель уровня 0.3.
	 * ПОЧЕМУ ВАЖНО: новый человек должен сразу увидеть посильные встречи, а не профессиональные; ошибки — понятны.
	 */
	@Test
	void boundariesRolesAndColdStart() {
		// 1. Ошибки.
		var newcomer = api.newUser("recNewcomer");
		assertThatApi(() -> newcomer.recommendedEvents(Map.of("lat", "56.0")))
				.fails(BAD_REQUEST, "Для подбора рядом укажите и широту, и долготу");
		assertThatApi(() -> api.guest().recommendedEvents(Map.of())).fails(UNAUTHORIZED);
		assertThatApi(() -> newcomer.dismissRecommendation(UUID.randomUUID(), "NOT_INTERESTED"))
				.fails(NOT_FOUND, "Мероприятие не найдено");

		// 2. Организация не записывается — подборка пустая.
		var page = api.newOrganization("recOrgAccount").recommendedEvents(Map.of());
		assertThat(page.items()).isEmpty();
		assertThat(page.totalElements()).isZero();

		// 3. Холодный старт: уровень решает.
		var author = api.newUser("recLevels");
		var sport = TestApi.uniqueName("Скалолазание ");
		var pro = author.createEvent(EventForm.free().sport(sport).level("PRO"));
		var easy = author.createEvent(EventForm.free().sport(sport).level("BEGINNER")).id();
		var picked = newcomer.recommendedEvents(Map.of("sportId", pro.sport().id().toString()));
		assertThat(ids(picked)).containsExactly(easy, pro.id());
		assertThat(codes(item(picked, easy).reasons())).contains(RecommendationReasonCode.BEGINNER_FRIENDLY);
		var proExplain = newcomer.explainRecommendation(pro.id());
		assertThat(proExplain.levelGate()).isEqualTo(0.3);
		assertThat(feature(proExplain, RecommendationFeatureCode.SPORT).weight()).isZero();
	}

	/**
	 * ФЛОУ: подборка учитывает, с кем и у кого человек уже занимался.
	 * ШАГИ:
	 *   1. Я и знакомый были на одной встрече организатора (встреча перенесена в прошлое).
	 *   2. Другой организатор создаёт две одинаковые встречи нового вида, знакомый записывается на одну.
	 *   3. Прежний организатор создаёт новую встречу; другой — встречу того вида, где я уже был.
	 * ПРОВЕРЯЕМ: у встречи со знакомым есть «Идёт Иван…» и признак SOCIAL, оценка выше, чем у такой же без него;
	 *   у встречи прежнего организатора — «знакомый организатор»; вид из истории — «ваш вид».
	 * ПОЧЕМУ ВАЖНО: идти к знакомым людям проще — это главный способ «найти своих», о котором просит ТЗ.
	 */
	@Test
	void historyFriendsAndKnownOrganizerBoostEvents() {
		// 1. Совместная прошлая встреча.
		var host = api.newUser("recHost");
		var me = api.newUser("recMe");
		var friend = api.newUser("recFriend");
		var pastSport = TestApi.uniqueName("Волейбол ");
		var past = host.createEvent(EventForm.free().sport(pastSport)).id();
		me.joinEvent(past);
		friend.joinEvent(past);
		moveToPast(host, past);

		// 2. Встречи с знакомым и без.
		var otherHost = api.newUser("recOtherHost");
		var newSport = TestApi.uniqueName("Падел ");
		var withFriend = otherHost.createEvent(EventForm.free().sport(newSport)).id();
		var withoutFriend = otherHost.createEvent(EventForm.free().sport(newSport)).id();
		friend.joinEvent(withFriend);
		var social = me.explainRecommendation(withFriend);
		assertThat(feature(social, RecommendationFeatureCode.SOCIAL).value()).isPositive();
		assertThat(social.reasons()).filteredOn(r -> r.code() == RecommendationReasonCode.FRIENDS_GOING)
				.singleElement().satisfies(r -> assertThat(r.text()).startsWith("Идёт Иван"));
		assertThat(social.score()).isGreaterThan(me.explainRecommendation(withoutFriend).score());

		// 3. Знакомый организатор и вид из истории.
		var fromHost = me.explainRecommendation(host.createEvent(EventForm.free().sport(newSport)).id());
		assertThat(feature(fromHost, RecommendationFeatureCode.ORGANIZER).value()).isPositive();
		assertThat(codes(fromHost.reasons())).contains(RecommendationReasonCode.KNOWN_ORGANIZER);
		var sameSport = me.explainRecommendation(otherHost.createEvent(EventForm.free().sport(pastSport)).id());
		assertThat(sameSport.reasons()).filteredOn(r -> r.code() == RecommendationReasonCode.YOUR_SPORT)
				.singleElement().satisfies(r -> assertThat(r.text()).startsWith("Вы часто выбираете"));
	}

	/**
	 * ФЛОУ: «Клубы для вас» по видам спорта, месту и активности.
	 * ШАГИ:
	 *   1. Админ одобряет три клуба: с моим видом спорта и встречей, с другим видом и встречей, без встреч.
	 *   2. Я сохраняю этот вид спорта и дом; открываю подборку клубов.
	 * ПРОВЕРЯЕМ: клуб моего вида в подборке с причиной «Ваши виды» и счётчиком встреч, выше клуба другого вида;
	 *   клуба без ближайших встреч нет.
	 * ПОЧЕМУ ВАЖНО: человеку проще прийти в сообщество, которое занимается тем же и рядом, чем искать вслепую.
	 */
	@Test
	void clubsMatchSportsAndNeedUpcomingMeetings() {
		// 1. Клубы.
		var admin = api.newAdmin();
		var mySport = TestApi.uniqueName("Бадминтон ");
		var matching = approvedClub(admin, "recClubMine", mySport);
		matching.account().createEvent(EventForm.free().sport(mySport));
		var otherSport = TestApi.uniqueName("Городки ");
		var other = approvedClub(admin, "recClubOther", otherSport);
		other.account().createEvent(EventForm.free().sport(otherSport));
		var idle = approvedClub(admin, "recClubIdle", mySport);

		// 2. Подборка клубов.
		var fan = api.newUser("recClubFan");
		fan.saveMySports(new SaveUserSportsRequest(List.of(new UserSportRequest(null, mySport, SportLevel.AMATEUR))));
		fan.saveMyPreferences(new SaveUserPreferencesRequest(SportLevel.AMATEUR, List.of(DayOfWeek.SATURDAY),
				Daytime.DAY, 10, new HelpersPreferences(true, true, false), HOME));
		var clubs = fan.recommendedOrganizations(Map.of("limit", "20"));
		var clubIds = clubs.stream().map(c -> c.organization().id()).toList();
		assertThat(clubIds).contains(matching.id()).doesNotContain(idle.id());
		if (clubIds.contains(other.id())) {
			assertThat(clubIds.indexOf(matching.id())).isLessThan(clubIds.indexOf(other.id()));
		}
		var card = clubs.stream().filter(c -> c.organization().id().equals(matching.id())).findFirst().orElseThrow();
		assertThat(card.reasons()).filteredOn(r -> r.code() == RecommendationReasonCode.YOUR_SPORT).isNotEmpty();
		assertThat(card.upcomingEvents()).isEqualTo(1);
		assertThat(card.sports()).extracting(s -> s.name()).contains(mySport);
	}

	private record Club(UUID id, Actor account) {
	}

	private Club approvedClub(Actor admin, String prefix, String sport) {
		var account = api.newOrganization(prefix);
		var id = account.submitOrganization(OrganizationForm.valid().sports(sport)).id();
		admin.approveOrganization(id);
		return new Club(id, account);
	}

	/** Подготовка прошедшей встречи: через API прошлое время не задать. */
	private void moveToPast(Actor organizer, UUID eventId) {
		var occurrence = occurrences.findById(organizer.occurrences(eventId).getFirst().id()).orElseThrow();
		occurrence.setStartAt(Instant.now().minus(Duration.ofDays(3)));
		occurrence.setEndAt(occurrence.getStartAt().plus(Duration.ofHours(1)));
		occurrences.saveAndFlush(occurrence);
	}

	private static List<UUID> ids(PageResponse<RecommendedEventResponse> page) {
		return page.items().stream().map(item -> item.event().id()).toList();
	}

	private static RecommendedEventResponse item(PageResponse<RecommendedEventResponse> page, UUID eventId) {
		return page.items().stream().filter(item -> item.event().id().equals(eventId)).findFirst().orElseThrow();
	}

	private static List<RecommendationReasonCode> codes(List<RecommendationReason> reasons) {
		return reasons.stream().map(RecommendationReason::code).toList();
	}

	private static RecommendationFeature feature(RecommendationExplainResponse explain, RecommendationFeatureCode code) {
		return explain.features().stream().filter(f -> f.code() == code).findFirst().orElseThrow();
	}
}
