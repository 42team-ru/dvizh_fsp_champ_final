package com.hackathon.app.demo;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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
 * Блог, как его написали бы люди: гайды клубов и участников с фотографиями, посты с прошедших встреч (фото — из
 * альбома встречи), черновик, лайки и обсуждения с ответами. Всё через BlogService и BlogCommentService, как из REST;
 * потом даты публикации расходятся по последнему месяцу, чтобы лента блога выглядела живой.
 */
@Component
@RequiredArgsConstructor
class DemoBlogSeeder {

	private final BlogService blog;
	private final BlogCommentService comments;
	private final SportService sports;
	private final DemoPhotos photos;
	private final DemoDataRepository data;
	private final Clock clock;

	/** Опубликованный пост и сколько дней назад. */
	private record Published(UUID id, int daysAgo) {
	}

	void seed(DemoCast cast, UUID ladyaOrganizationId, UUID beaversOrganizationId) {
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
		var posts = new ArrayList<Published>();

		// --- Гайды ---

		var chessGuide = guide(ladya, "Шахматы", "Как прийти в шахматный клуб, если играл только с телефоном", """
				Если ты играл только в приложении, клуб кажется закрытым миром: тишина, часы, серьёзные лица. \
				На деле половина наших новичков пришла именно так — и через месяц уже спорила о дебютах за чаем.

				## 1. Найди встречу с уровнем «Любой» или «Новичок»

				В ленте поставь фильтр **«Шахматы»** и уровень «Новичок». У нас это открытые уроки: \
				новичков специально сажают с опытными, а тренер ходит между столами.

				## 2. Разберись с контролем времени

				`10+5` значит: у каждого 10 минут на партию и +5 секунд за каждый ход. \
				Для первой живой партии — идеально: и подумать успеешь, и не засидишься.

				## 3. Пиши ходы — это нормально

				Бланк дадут на месте. Пиши как в приложении: `e4`, `Кf3`, `0-0`. Запутался — спроси соседа, \
				он тоже когда-то путал короткую рокировку с длинной.

				> Проиграть первую партию — традиция клуба. Главное — пожать руку и попросить разбор.

				## Неписаные правила

				- взялся за фигуру — ходи ею;
				- телефон — в рюкзак, даже если очень хочется проверить позицию;
				- нажимай часы той же рукой, которой ходил;
				- после партии — ||разбор и печенье||.

				Ближайшие встречи клуба — в виджете ниже. Приходите, доски уже расставлены.""",
				photos("Шахматы", 0, "Доски ждут гостей", "Турнир выходного дня", "Разбор после партии"),
				ladyaOrganizationId, null);
		posts.add(new Published(chessGuide, 24));

		var exerciseGuide = guide(olga, "Зарядка", "Зарядка во дворе после 60: с чего начать", """
				Третий год каждое утро выхожу во двор, и соседи понемногу подтягиваются. Сначала смеялись, \
				теперь занимают скамейку заранее. Делюсь, как начать, если давно не двигались.

				## Почему утро

				Воздух свежее, двор пустой, а день потом идёт бодрее. *Вечером* всегда находятся дела, \
				а утром — только вы и пятнадцать минут для себя.

				## Пять упражнений без коврика

				1. Наклоны головы — медленно, по 5 раз в каждую сторону.
				2. Круги плечами вперёд и назад.
				3. Повороты корпуса, руки на поясе.
				4. Шаги на месте с высоким подниманием колен — можно держаться за спинку скамейки.
				5. Глубокий вдох — руки вверх, выдох — руки вниз.

				> Главное правило — без рывков и через улыбку. Заболело — остановитесь.

				## Как позвать соседей

				Создайте встречу «Зарядка во дворе», уровень «Любой», и распечатайте афишу из кнопки «Поделиться» — \
				повесьте у подъезда. Первой пришла Нина Петровна с пятого этажа, теперь нас девять.""",
				photos("Зарядка", 0, "Наш двор в 9 утра", "Всё можно делать сидя"), null, olga);
		posts.add(new Published(exerciseGuide, 19));

		var runGuide = guide(elena, "Бег", "Первые 5 км: план на четыре недели без героизма", """
				Я бегаю полумарафоны, но помню, как задыхалась на первом километре. Вот план, с которым \
				уже десяток людей из наших пробежек добежали свои первые пять километров.

				## Неделя 1
				Три раза: 1 минута бега + 2 минуты шага, повторить 8 раз.

				## Неделя 2
				Три раза: 2 минуты бега + 1 минута шага, 8 повторов.

				## Неделя 3
				Три раза: 5 минут бега + 1 минута шага, 4 повтора.

				## Неделя 4
				Два раза по 20 минут без остановки и в выходные — **те самые 5 км** с нашей группой.

				## Что важно

				- темп разговорный: если не можешь сказать фразу целиком — сбавь;
				- кроссовки важнее часов, часы важнее приложения, приложение не важно вообще;
				- болит колено — не геройствуй, пропусти тренировку;
				- в группе бежать в два раза легче, проверено.

				> Не сравнивай свою первую неделю с чьим-то пятым годом.

				Приходите на утреннюю пробежку по набережной — бежим так, чтобы никто не отстал.""",
				photos("Бег", 0, "Финиш у моста", "Растяжка после пробежки", "Утро на набережной"), null, elena);
		posts.add(new Published(runGuide, 15));

		var petanqueGuide = guide(nikolai, "Петанк", "Петанк за 10 минут: правила, которые я объясняю на лавочке", """
				Привёз шары из Франции пять лет назад и с тех пор учу всех желающих. Петанк — это когда \
				бабушка обыгрывает внука, а потом они вместе спорят, чей шар ближе.

				## Суть

				Бросаешь маленький деревянный шарик — **кошонет**. Потом команды по очереди бросают металлические \
				шары: чей ближе к кошонету, тот и выигрывает очко.

				## Правила одной строкой

				1. Бросаешь из круга, ноги не отрываешь от земли.
				2. Бросает команда, чей шар сейчас *дальше*.
				3. Можно выбить чужой шар — это самое весёлое.
				4. Играем до 13 очков.

				## Что нужно

				- ровная площадка с гравием или утоптанной землёй;
				- шары (у меня есть на всех);
				- рулетка — спорить о сантиметрах.

				> Во Франции говорят: в петанк нельзя проиграть, можно только недоиграть.

				Приходите в Центральный парк — научу за десять минут, остальное — практика.""",
				photos("Петанк", 0, "Кто ближе?", "Шары после партии", "Играем всей семьёй"), null, nikolai);
		posts.add(new Published(petanqueGuide, 12));

		var footballGuide = guide(dmitry, "Футбол", "Футбол 5×5: как собрать игру и не поругаться", """
				Шесть лет собираю любительский футбол. За это время понял: сложнее всего не найти поле, \
				а сделать так, чтобы все пришли снова.

				## Состав

				Записывай на две полные команды и ещё двоих сверху: кто-то всегда заболеет. \
				В приложении поставь лимит мест — остальные встанут в лист ожидания и попадут сами, если место освободится.

				## Команды делим на месте

				Капитаны выбирают по очереди, но **новичков раскидываем поровну**. \
				Если одна команда ведёт 5:0 — меняемся игроками, а не терпим до конца.

				## Правила, о которых договариваемся до игры

				- без подкатов и толчков в спину;
				- аут ногой, а не руками — так быстрее;
				- спорный момент — переигровка, а не 10 минут криков;
				- вратарь меняется каждые 10 минут, если нет добровольца.

				> Мы играем, чтобы прийти на работу в понедельник довольными, а не хромыми.

				## После игры

				Пять минут на общее фото и чат: напиши, когда следующая. Так из случайных людей собирается команда.""",
				photos("Футбол", 0, "Перед стартом", "Второй тайм", "Команда вечера"), null, dmitry);
		posts.add(new Published(footballGuide, 9));

		var hockeyGuide = guide(bobry, "Хоккей", "Хоккей для взрослых с нуля: от проката коньков до первой двусторонки",
				"""
				Каждый сезон к нам приходят люди, которые последний раз стояли на коньках в школе. \
				Через два месяца они играют двусторонку. Рассказываем, как это происходит.

				## Шаг 1. Коньки

				Начни с проката на арене: не трать деньги, пока не поймёшь, что тебе нравится. \
				Ботинок должен сидеть плотно, а пятка — не болтаться.

				## Шаг 2. Катание

				Первые три тренировки — только катание: торможение «плугом», перекрёстный шаг, \
				езда спиной вперёд. Скучно? Зато потом не падаешь на каждом повороте.

				## Шаг 3. Экипировка

				Шлем с визором, перчатки, щитки, налокотники, шорты. Клюшку и краги на первое время дадим.

				## Шаг 4. Двусторонка

				Без силовой борьбы, с обязательной сменой каждые полторы минуты. \
				Ошибаться можно, ругаться нельзя.

				> Хоккей — это не про силу, а про то, чтобы вовремя отдать пас.

				Ближайшие тренировки «Хищных бобров» — в виджете ниже.""",
				photos("Хоккей", 0, "Вечерний лёд", "Разминка перед двусторонкой"), beaversOrganizationId, null);
		posts.add(new Published(hockeyGuide, 7));

		var tennisGuide = guide(sergey, "Настольный теннис", "Пинг-понг во дворе: стол, ракетка и счёт до 11", """
				Во дворе на Ленина стоит бетонный стол, и летом за ним очередь. Вот что нужно знать, \
				чтобы не стоять в ней зрителем.

				## Ракетка

				Не покупай профессиональную за десять тысяч. Готовая ракетка за 1500 ₽ прослужит сезон, \
				а дальше поймёшь, чего хочешь.

				## Счёт

				- партия до 11 очков, при 10:10 — до разницы в два;
				- подача меняется каждые два очка;
				- играем до двух выигранных партий, проигравший уступает стол.

				## Подача

				Мяч подбрасывают с открытой ладони минимум на 16 см и бьют, когда он падает. \
				Мяч должен удариться о свою половину, потом — о чужую.

				> Самый важный навык — подать так, чтобы соперник улыбнулся, а не обиделся.

				Записывайтесь на встречу: мест два, но лист ожидания работает сам.""",
				photos("Настольный теннис", 0, "Стол во дворе", "Решающая партия"), null, sergey);
		posts.add(new Published(tennisGuide, 5));

		var organizerGuide = guide(vika, null, "Две встречи в день и ни одного выгорания: чек-лист организатора", """
				За полтора месяца я провела девяносто встреч. Нет, я не сошла с ума — просто нашла ритм. \
				Делюсь чек-листом, который висит у меня на холодильнике.

				## За день до встречи

				- написать объявление в карточке: где встречаемся и что взять;
				- проверить погоду и запасной вариант;
				- ответить на все вопросы в обсуждении — неотвеченный вопрос = непришедший человек.

				## На месте

				1. Прийти за 15 минут и встать там, где тебя видно.
				2. Знакомить новичков друг с другом по именам.
				3. Начинать вовремя, даже если пришли трое.

				## После

				- фото в галерею встречи — люди любят находить себя;
				- «спасибо» в обсуждении;
				- следующая встреча в ленте **сразу**, пока всем хорошо.

				> Встречу делает не площадка, а то, что тебя ждут.

				И да: бобр одет с иголочки на монеты за проведённые встречи. Мотивирует лучше любого будильника.""",
				photos("Волейбол", 0, "Вечерняя игра", "Йога утром", "Бадминтон по вторникам"), null, vika);
		posts.add(new Published(organizerGuide, 3));

		// Черновик: виден только автору — Пётр ещё дописывает.
		guideDraft(petr, "Шахматы", "Дебюты для ленивых: три схемы на все случаи (черновик)", """
				## Белыми — Лондонская система

				d4, Сf4, e3, Кf3 — и почти против всего.

				## Чёрными против e4 — ...

				*Допишу после турнира.*""");

		// --- Посты с прошедших встреч ---

		// Анна пишет о второй по свежести встрече: о самой свежей бобр ещё спросит «Как прошло?».
		var annaEvents = blog.eligibleEvents(anna);
		UUID annaPost = null;
		if (annaEvents.size() > 1) {
			var event = annaEvents.get(1);
			annaPost = report(anna, event, "Первый раз на «" + event.title() + "»: что я поняла", """
					Записалась почти случайно: увидела в ленте, что уровень **«Любой»**, и решила — была не была.

					## Как всё было

					Организатор встретил у входа, показал, где оставить вещи, и сразу познакомил с группой. \
					Темп держали спокойный — *никто не остаётся один*, это правило здесь соблюдают.

					> Если не можешь говорить — сбавляй. Мы занимаемся вместе, а не на время.

					## Что взять в следующий раз

					- воду — после первого часа очень хочется пить;
					- удобную обувь, а не новые кроссовки;
					- хорошее настроение (и ||пару конфет для бобра||).

					Иду снова на следующей неделе — уже позвала соседку!""");
			posts.add(new Published(annaPost, 2));
		}

		// Пётр — организатор: отчёт о своей встрече.
		var petrEvents = blog.eligibleEvents(petr);
		UUID petrPost = null;
		if (!petrEvents.isEmpty()) {
			var event = petrEvents.getFirst();
			petrPost = report(petr, event, event.title() + ": собрали полный состав", """
					Спасибо всем, кто пришёл! Новенькие сначала стеснялись, к концу уже спорили о правилах — \
					значит, получилось.

					**Итоги вечера:**

					1. Сыграли три партии, счёт держали честно.
					2. Двое пришли впервые и уже записались на следующий раз.
					3. Доски и часы — с меня, хорошее настроение — с вас.

					Расписание ближайших встреч — в виджете ниже. Вопросы пишите в комментарии, отвечу.""");
			posts.add(new Published(petrPost, 1));
		}

		// Виктория — отчёт о своей встрече.
		var vikaEvents = blog.eligibleEvents(vika);
		UUID vikaPost = null;
		if (!vikaEvents.isEmpty()) {
			var event = vikaEvents.getFirst();
			vikaPost = report(vika, event, "«" + event.title() + "»: десять человек и ни одного опоздания", """
					Сегодня впервые все пришли вовремя — я даже растерялась. \
					Разминались под музыку, потом играли до последнего света.

					## Кого благодарю

					- тех, кто принёс воду на всех;
					- новеньких — вы держались лучше многих ветеранов;
					- погоду, которая не подвела.

					Фото — ниже, ищите себя. Следующая встреча уже в ленте.""");
			posts.add(new Published(vikaPost, 4));
		}

		// --- Лайки и обсуждения ---

		var likers = List.of("anna", "petr", "olga", "dmitry", "elena", "sergey", "nikolai", "vika");
		for (var post : posts) {
			for (var username : likers) {
				var id = cast.id(username);
				if (id != null && Math.floorMod(post.id().hashCode() + username.hashCode(), 3) != 0) {
					blog.like(post.id(), id);
				}
			}
		}
		var chessQuestion = say(chessGuide, olga, 23,
				"А можно прийти, если мне 67 и я последний раз играла с внуком лет пять назад?", null);
		say(chessGuide, ladya, 23, "Конечно! На открытом уроке посадим вас с тренером — он как раз любит объяснять.",
				chessQuestion);
		say(chessGuide, olga, 22, "Спасибо, записалась!", chessQuestion);
		say(chessGuide, anna, 20, "Про «взялся — ходи» не знала, теперь буду осторожнее 😅", null);

		say(exerciseGuide, anna, 18, "Попробовала сегодня утром — бодрит! Спасибо за список.", null);
		var kneesQuestion = say(exerciseGuide, nikolai, 17, "А если колени болят, шаги на месте можно заменить?", null);
		say(exerciseGuide, olga, 17, "Можно сидя на скамейке поочерёдно поднимать колени — эффект тот же.", kneesQuestion);

		var planQuestion = say(runGuide, anna, 14, "Я сейчас на второй неделе! Можно повторить неделю, если тяжело?", null);
		say(runGuide, elena, 14, "Нужно! План под тебя, а не ты под план.", planQuestion);
		say(runGuide, dmitry, 13, "Сохранил себе, начну с понедельника. В этот раз точно.", null);

		say(petanqueGuide, olga, 11, "Николай, вы так интересно рассказываете — приду в субботу с внуком.", null);
		var ballsQuestion = say(petanqueGuide, sergey, 10, "А где купить такие шары?", null);
		say(petanqueGuide, nikolai, 10, "В спортивных магазинах есть наборы, но сначала поиграйте моими.", ballsQuestion);

		say(footballGuide, sergey, 8, "Про вратаря каждые 10 минут — гениально, у нас вечно спор.", null);
		var limitQuestion = say(footballGuide, petr, 8, "А если записалось 30 человек?", null);
		say(footballGuide, dmitry, 8, "Тогда три команды на вылет до двух голов — скучно не будет.", limitQuestion);

		say(hockeyGuide, dmitry, 6, "Пришёл по этому гайду на тренировку — первые 20 минут держался за борт, но было здорово!",
				null);
		say(organizerGuide, elena, 2, "Утащила чек-лист себе на холодильник 🙌", null);
		var vikaQuestion = say(organizerGuide, petr, 2, "Как не выгорать, если на встречу пришли двое?", null);
		say(organizerGuide, vika, 2, "Провести так же хорошо, как для двадцати. Эти двое приведут друзей.", vikaQuestion);

		if (annaPost != null) {
			var ask = say(annaPost, elena, 2, "Классный отчёт! Сколько по времени заняла встреча?", null);
			say(annaPost, anna, 2, "Около полутора часов вместе с разминкой.", ask);
		}
		if (petrPost != null) {
			say(petrPost, dmitry, 1, "Отличный вечер, в следующий раз приведу брата.", null);
		}
		if (vikaPost != null) {
			say(vikaPost, cast.id("sergey"), 3, "Нашёл себя на третьем фото, спасибо!", null);
		}

		// Даты публикации — в прошлое, по одному-два поста в несколько дней.
		var now = clock.instant();
		for (var post : posts) {
			data.backdateBlogPost(post.id(), now.minus(Duration.ofDays(post.daysAgo())).minus(Duration.ofHours(5)));
		}
	}

	/** Фото для поста: загрузить снимки вида спорта и подписать; если снимков нет — иллюстрация вида. */
	private List<Upload> photos(String sport, int from, String... captions) {
		var list = new ArrayList<Upload>();
		var real = photos.pick(sport, true, from, captions.length);
		for (int i = 0; i < real.size(); i++) {
			list.add(new Upload(real.get(i), captions[i]));
		}
		return list;
	}

	/** Файл и подпись для поста. */
	private record Upload(FileUpload file, String caption) {
	}

	private UUID guide(UUID authorId, String sport, String title, String body, List<Upload> uploads,
			UUID widgetOrganizationId, UUID widgetUserId) {
		return blog.create(authorId, new BlogPostRequest(BlogPostType.GUIDE, null, sportId(sport), title, body,
				upload(authorId, uploads, sport), widgetOrganizationId, widgetUserId, true, true)).post().id();
	}

	private void guideDraft(UUID authorId, String sport, String title, String body) {
		blog.create(authorId, new BlogPostRequest(BlogPostType.GUIDE, null, sportId(sport), title, body, List.of(), null,
				null, true, false));
	}

	/** Загрузить фото поста от имени автора (как в редакторе); без снимков — одна иллюстрация вида спорта. */
	private List<BlogPhotoRequest> upload(UUID authorId, List<Upload> uploads, String sport) {
		if (uploads.isEmpty()) {
			var slug = sport == null ? "default" : sports.search(sport).stream()
					.filter(s -> s.name().equals(sport)).map(s -> s.slug()).findFirst().orElse("default");
			return List.of(new BlogPhotoRequest(blog.uploadPhoto(authorId, DemoAlbumSeeder.image(slug)).id(), null));
		}
		return uploads.stream()
				.map(u -> new BlogPhotoRequest(blog.uploadPhoto(authorId, u.file()).id(), u.caption()))
				.toList();
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
