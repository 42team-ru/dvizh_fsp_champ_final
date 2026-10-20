package com.hackathon.app.demo;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.demo.DemoBlogTexts.Guide;
import com.hackathon.app.domain.dto.BlogEventResponse;
import com.hackathon.app.domain.dto.BlogPhotoRequest;
import com.hackathon.app.domain.dto.BlogPostRequest;
import com.hackathon.app.domain.dto.FileUpload;
import com.hackathon.app.domain.entity.BlogComment;
import com.hackathon.app.domain.enums.BlogPostType;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.service.BlogCommentService;
import com.hackathon.app.service.BlogService;
import com.hackathon.app.service.SportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Блог, как его написали бы люди: длинные гайды клубов и участников с фотографиями ({@link DemoBlogTexts}), посты
 * с прошедших встреч (фото — из альбома встречи), черновик, лайки и обсуждения с ответами. Всё через BlogService и
 * BlogCommentService, как из REST; потом даты публикации расходятся по последним полутора месяцам.
 * <p>
 * Два шага: {@link #guides} — до альбомов, чтобы гайдам достались снимки витрины ({@link DemoPhotos} выдаёт каждый
 * один раз), {@link #reports} — после, потому что отчёт берёт фото из альбома встречи.
 */
@Component
@RequiredArgsConstructor
class DemoBlogSeeder {

	private static final List<String> LIKERS = List.of("anna", "petr", "olga", "dmitry", "elena", "sergey", "nikolai",
			"vika");

	private final BlogService blog;
	private final BlogCommentService comments;
	private final SportService sports;
	private final DemoPhotos photos;
	private final DemoDataRepository data;
	private final Clock clock;

	/** Опубликованные посты и сколько дней назад: дата выставляется в самом конце. */
	private final Map<UUID, Integer> published = new HashMap<>();
	/** Гайды по порядку в {@link DemoBlogTexts#GUIDES} — для обсуждений. */
	private final List<UUID> guides = new ArrayList<>();

	/** Гайды и черновик; organizations — id организации аккаунта ORG (виджет «Наши тренировки»). */
	void guides(DemoCast cast, Map<String, UUID> organizations) {
		for (var guide : DemoBlogTexts.GUIDES) {
			var authorId = cast.id(guide.author());
			var organizationId = organizations.get(guide.author());
			var id = blog.create(authorId, new BlogPostRequest(BlogPostType.GUIDE, null, sportId(guide.sport()),
					guide.title(), guide.body(), upload(authorId, guide), organizationId,
					organizationId == null ? authorId : null, true, true)).post().id();
			guides.add(id);
			published.put(id, guide.daysAgo());
		}
		var draft = DemoBlogTexts.DRAFT;
		blog.create(cast.id(draft.author()), new BlogPostRequest(BlogPostType.GUIDE, null, sportId(draft.sport()),
				draft.title(), draft.body(), List.of(), null, null, true, false));
		discussGuides(cast);
	}

	/** Посты с прошедших встреч, лайки и даты публикации — после альбомов. */
	void reports(DemoCast cast) {
		var anna = cast.id("anna");
		var petr = cast.id("petr");
		var vika = cast.id("vika");

		// Анна пишет о второй по свежести встрече: о самой свежей бобр ещё спросит «Как прошло?».
		var annaEvents = blog.eligibleEvents(anna);
		if (annaEvents.size() > 1) {
			var event = annaEvents.get(1);
			var post = report(anna, event, "Первый раз на «" + event.title() + "»: что я поняла", """
					Записалась почти случайно: увидела в ленте, что уровень **«Любой»**, и решила — была не была. \
					Всю дорогу думала развернуться: вдруг там все профи, а я буду стоять в углу.

					## Как всё было

					Организатор встретил у входа, показал, где оставить вещи, и сразу познакомил с группой. \
					Темп держали спокойный — *никто не остаётся один*, это правило здесь соблюдают всерьёз. \
					Через двадцать минут я уже смеялась вместе со всеми и забыла, что собиралась стесняться.

					> Если не можешь говорить — сбавляй. Мы занимаемся вместе, а не на время.

					## Что меня удивило

					- никто не смотрел, как у меня получается, — все были заняты собой и друг другом;
					- после встречи половина группы пошла пить чай, и меня позвали;
					- организатор написал в обсуждении «спасибо, что пришли» — каждому по имени.

					## Что взять в следующий раз

					- воду — после первого часа очень хочется пить;
					- удобную обувь, а не новые кроссовки;
					- хорошее настроение (и ||пару конфет для бобра||).

					Иду снова на следующей неделе — уже позвала соседку!""");
			published.put(post, 2);
			var ask = say(post, cast.id("elena"), 2, "Классный отчёт! Сколько по времени заняла встреча?", null);
			say(post, anna, 2, "Около полутора часов вместе с разминкой и чаем.", ask);
		}

		// Пётр — организатор: отчёт о своей встрече.
		var petrEvents = blog.eligibleEvents(petr);
		if (!petrEvents.isEmpty()) {
			var event = petrEvents.getFirst();
			var post = report(petr, event, event.title() + ": собрали полный состав", """
					Спасибо всем, кто пришёл! Новенькие сначала стеснялись, к концу уже спорили о правилах — \
					значит, получилось.

					## Итоги вечера

					1. Сыграли три партии, счёт держали честно.
					2. Двое пришли впервые и уже записались на следующий раз.
					3. Доски и часы — с меня, хорошее настроение — с вас.

					## Что поменяем

					Многие просили разбор партий в конце — сделаем: последние двадцать минут разбираем самую \
					интересную партию вечера на демонстрационной доске. Предлагайте свои.

					Расписание ближайших встреч — в виджете ниже. Вопросы пишите в комментарии, отвечу.""");
			published.put(post, 1);
			say(post, cast.id("dmitry"), 1, "Отличный вечер, в следующий раз приведу брата.", null);
		}

		// Виктория — отчёт о своей встрече.
		var vikaEvents = blog.eligibleEvents(vika);
		if (!vikaEvents.isEmpty()) {
			var event = vikaEvents.getFirst();
			var post = report(vika, event, "«" + event.title() + "»: десять человек и ни одного опоздания", """
					Сегодня впервые все пришли вовремя — я даже растерялась. Разминались под музыку, потом играли \
					до последнего света, а потом ещё полчаса не могли разойтись.

					## Кого благодарю

					- тех, кто принёс воду на всех;
					- новеньких — вы держались лучше многих ветеранов;
					- погоду, которая не подвела.

					Фото — ниже, ищите себя. Следующая встреча уже в ленте.""");
			published.put(post, 4);
			say(post, cast.id("sergey"), 3, "Нашёл себя на третьем фото, спасибо!", null);
		}

		// Лайки: у каждого поста своя компания читателей.
		for (var post : published.keySet()) {
			for (var username : LIKERS) {
				var id = cast.id(username);
				if (id != null && Math.floorMod(post.hashCode() + username.hashCode(), 3) != 0) {
					blog.like(post, id);
				}
			}
		}

		// Даты публикации — в прошлое: лента блога живёт полтора месяца, а не родилась одним утром.
		var now = clock.instant();
		published.forEach((id, daysAgo) ->
				data.backdateBlogPost(id, now.minus(Duration.ofDays(daysAgo)).minus(Duration.ofHours(5))));
	}

	/** Обсуждения гайдов: вопросы читателей и ответы авторов (номера — порядок в {@link DemoBlogTexts#GUIDES}). */
	private void discussGuides(DemoCast cast) {
		var anna = cast.id("anna");
		var petr = cast.id("petr");
		var olga = cast.id("olga");
		var elena = cast.id("elena");
		var dmitry = cast.id("dmitry");
		var sergey = cast.id("sergey");
		var nikolai = cast.id("nikolai");
		var vika = cast.id("vika");
		var ladya = cast.id("ladya");
		var bobry = cast.id("bobry");

		var chess = guides.get(0);
		var q1 = say(chess, olga, 37, "А можно прийти, если мне 67 и я последний раз играла с внуком лет пять назад?", null);
		say(chess, ladya, 37, "Конечно! На открытом уроке посадим вас с тренером — он как раз любит объяснять.", q1);
		say(chess, olga, 36, "Спасибо, записалась!", q1);
		say(chess, anna, 33, "Про «взялся — ходи» не знала, теперь буду осторожнее 😅", null);
		var q2 = say(chess, dmitry, 30, "А часы на открытом уроке тоже есть или играем без времени?", null);
		say(chess, ladya, 30, "На уроке без часов, чтобы спокойно думать. Часы — со второй-третьей встречи.", q2);

		var traps = guides.get(1);
		say(traps, petr, 29, "Попался в Легаля в прошлый четверг. Теперь хотя бы знаю, как это называется.", null);
		var q3 = say(traps, nikolai, 28, "А против детского мата правда достаточно g6?", null);
		say(traps, ladya, 28, "Достаточно, если потом не забыть про f7. Фe7 надёжнее для самых первых партий.", q3);

		var exercise = guides.get(2);
		say(exercise, anna, 33, "Попробовала сегодня утром — бодрит! Спасибо за список.", null);
		var q4 = say(exercise, nikolai, 32, "А если колени болят, шаги на месте чем заменить?", null);
		say(exercise, olga, 32, "Сидя на скамейке поочерёдно поднимайте колени — эффект почти тот же.", q4);
		say(exercise, elena, 31, "«Пойдёмте со мной» — лучший маркетинг, который я видела 🙌", null);

		var run = guides.get(3);
		var q5 = say(run, anna, 26, "Я на второй неделе! Можно повторить неделю, если тяжело?", null);
		say(run, elena, 26, "Нужно! План под тебя, а не ты под план.", q5);
		say(run, dmitry, 25, "Сохранил себе, начну с понедельника. В этот раз точно.", null);
		say(run, vika, 24, "Скинула ссылку всей своей группе, спасибо за такой подробный текст.", null);

		var swim = guides.get(4);
		var q6 = say(swim, olga, 21, "Мне 66 и я тоже плаваю только брассом. Не поздно?", null);
		say(swim, elena, 21, "Совсем не поздно! На нашей дорожке есть участница 71 года.", q6);

		var petanque = guides.get(5);
		say(petanque, olga, 24, "Николай, вы так интересно рассказываете — приду в субботу с внуком.", null);
		var q7 = say(petanque, sergey, 23, "А где купить такие шары?", null);
		say(petanque, nikolai, 23, "В спортивных магазинах есть наборы, но сначала поиграйте моими.", q7);

		say(guides.get(6), olga, 16, "Оказывается, я три года носила палки, а не ходила с ними. Спасибо!", null);

		var football = guides.get(7);
		say(football, sergey, 19, "Про вратаря каждые 10 минут — гениально, у нас вечно спор.", null);
		var q8 = say(football, petr, 19, "А если записалось 30 человек?", null);
		say(football, dmitry, 19, "Тогда три команды на вылет до двух голов — скучно не будет.", q8);

		var hockey = guides.get(8);
		say(hockey, dmitry, 13, "Пришёл по этому гайду на тренировку — первые 20 минут держался за борт, но было здорово!",
				null);
		var q9 = say(hockey, sergey, 12, "Девушкам можно на ваши тренировки?", null);
		say(hockey, bobry, 12, "Конечно, у нас смешанный состав. Две девушки уже играют в двусторонке.", q9);

		say(guides.get(9), petr, 10, "Ягодичный мост после рабочего дня — это открытие.", null);
		say(guides.get(10), nikolai, 8, "Подтверждаю про бетонный стол: мяч летит как пуля.", null);

		var cycling = guides.get(11);
		var q10 = say(cycling, anna, 6, "У меня городской велосипед с корзинкой. Возьмёте?", null);
		say(cycling, sergey, 6, "Возьмём на прогулочный выезд! На шоссейный — пока рано.", q10);

		var organizer = guides.get(12);
		say(organizer, elena, 4, "Утащила чек-лист себе на холодильник 🙌", null);
		var q11 = say(organizer, petr, 4, "Как не выгорать, если на встречу пришли двое?", null);
		say(organizer, vika, 4, "Провести так же хорошо, как для двадцати. Эти двое приведут друзей.", q11);

		var yoga = guides.get(14);
		say(yoga, olga, 2, "Анна, я тоже «деревянная», приду на мягкую йогу в субботу!", null);
		say(yoga, vika, 2, "Фиолетовый коврик — это важно, полностью согласна 😄", null);

		say(guides.get(15), dmitry, 1, "«Кто следующий?» — святое. Подписываюсь под каждым словом.", null);
	}

	/** Фото гайда: снимки витрины его вида спорта (каждый — один раз); у гайда без вида — с разных встреч. */
	private List<BlogPhotoRequest> upload(UUID authorId, Guide guide) {
		var captions = guide.captions();
		var files = guide.sport() == null ? mixed(captions.size()) : photos.featured(guide.sport(), true, captions.size());
		var result = new ArrayList<BlogPhotoRequest>();
		for (int i = 0; i < files.size(); i++) {
			result.add(new BlogPhotoRequest(blog.uploadPhoto(authorId, files.get(i)).id(), captions.get(i)));
		}
		return result;
	}

	/** Гайд организатора без вида спорта: по снимку с её встреч разных видов. */
	private List<FileUpload> mixed(int count) {
		var result = new ArrayList<FileUpload>();
		for (var sport : List.of("Волейбол", "Йога", "Бадминтон")) {
			if (result.size() < count) {
				result.addAll(photos.featured(sport, false, 1));
			}
		}
		return result;
	}

	private UUID sportId(String sport) {
		if (sport == null) {
			return null;
		}
		return sports.search(sport).stream().filter(s -> s.name().equals(sport)).map(s -> s.id()).findFirst()
				.orElse(null);
	}

	/** Комментарий (replyToId — ответ на него), написанный daysAgo дней назад. */
	private UUID say(UUID postId, UUID authorId, int daysAgo, String text, UUID replyToId) {
		var id = comments.create(postId, authorId, text, replyToId).id();
		data.backdate(BlogComment.class, id, clock.instant().minus(Duration.ofDays(daysAgo)).plus(Duration.ofHours(2)));
		return id;
	}

	/** Пост с тренировки: до трёх фото из альбома встречи, виджет — клуб встречи или её организатор. */
	private UUID report(UUID authorId, BlogEventResponse event, String title, String body) {
		var photos = blog.eventPhotos(event.id(), authorId).stream().limit(3)
				.map(f -> new BlogPhotoRequest(f.id(), null)).toList();
		var organizationId = event.organization() == null
				|| event.organization().status() != OrganizationStatus.APPROVED ? null : event.organization().id();
		var organizerId = organizationId == null ? event.organizer().id() : null;
		var shortTitle = title.length() <= 120 ? title : title.substring(0, 119) + "…";
		return blog.create(authorId, new BlogPostRequest(BlogPostType.EVENT_REPORT, event.id(), null, shortTitle, body,
				photos, organizationId, organizerId, true, true)).post().id();
	}
}
