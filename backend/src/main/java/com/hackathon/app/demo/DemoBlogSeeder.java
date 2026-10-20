package com.hackathon.app.demo;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.BlogEventResponse;
import com.hackathon.app.domain.dto.BlogPhotoRequest;
import com.hackathon.app.domain.dto.BlogPostRequest;
import com.hackathon.app.domain.enums.BlogPostType;
import com.hackathon.app.domain.enums.OrganizationStatus;
import com.hackathon.app.service.BlogCommentService;
import com.hackathon.app.service.BlogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Блог, как его написали бы люди: посты с прошедших встреч (фото — из альбома встречи), гайды клуба и Ольги,
 * лайки и комментарии с ответами. Всё через BlogService и BlogCommentService, как из REST.
 */
@Component
@RequiredArgsConstructor
class DemoBlogSeeder {

	private final BlogService blog;
	private final BlogCommentService comments;

	void seed(DemoCast cast) {
		var anna = cast.id("anna");
		var petr = cast.id("petr");
		var olga = cast.id("olga");
		var ladya = cast.id("ladya");

		// Анна пишет о второй по свежести встрече: о самой свежей бобёр ещё спросит «Как прошло?».
		var annaEvents = blog.eligibleEvents(anna);
		UUID annaPost = null;
		if (annaEvents.size() > 1) {
			var event = annaEvents.get(1);
			annaPost = report(anna, event, "Первый раз на «" + event.title() + "»: что я поняла", """
					Записалась почти случайно: увидела в ленте, что уровень **«Любой»**, и решила — была не была.

					## Как всё было

					Организатор встретил у входа, показал, где переодеться, и сразу познакомил с группой. \
					Темп держали спокойный — *никто не бежит один*, это правило здесь соблюдают.

					> Если не можешь говорить — сбавляй. Мы занимаемся вместе, а не на время.

					## Что взять в следующий раз

					- воду — после первого часа очень хочется пить;
					- удобную обувь, а не новые кроссовки;
					- хорошее настроение (и ||пару конфет для бобра||).

					Иду снова на следующей неделе — уже позвала соседку!""");
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
					3. Мячи и манишки — с меня, вода — с вас.

					Расписание ближайших встреч — в виджете ниже. Вопросы пишите в комментарии, отвечу.""");
		}

		// Клуб «Ладья» — гайд для новичков с виджетом своих встреч.
		var ladyaEvents = blog.eligibleEvents(ladya);
		var chessSport = ladyaEvents.isEmpty() ? null : ladyaEvents.getFirst().sport().id();
		var organizationId = ladyaEvents.isEmpty() || ladyaEvents.getFirst().organization() == null ? null
				: ladyaEvents.getFirst().organization().id();
		var cover = blog.uploadPhoto(ladya, DemoAlbumSeeder.image("chess"));
		var ladyaGuide = blog.create(ladya, new BlogPostRequest(BlogPostType.GUIDE, null, chessSport,
				"Как прийти в шахматный клуб, если играл только с телефоном", """
						Если ты играл только в приложении, клуб кажется закрытым миром. На деле половина наших новичков \
						пришла именно так.

						## 1. Найди встречу с уровнем «Любой»

						В ленте поставь фильтр **«Шахматы»** и уровень «Любой» или «Новичок». У нас это открытые уроки — \
						там специально сажают новичков с опытными.

						## 2. Разберись с контролем времени

						`15+10` значит: у каждого 15 минут на партию и +10 секунд за ход. Для первой встречи — идеально.

						## 3. Записывай партию — это нормально

						Бланк дадут на месте. Пиши ходы как в приложении: `e4`, `Кf3`. Запутался — спроси соседа.

						> Проиграть первую партию — традиция. Главное — пожать руку и попросить разбор.

						## Что взять с собой

						- ручку для бланка;
						- воду: партии бывают долгими;
						- хорошее настроение.""",
				List.of(new BlogPhotoRequest(cover.id(), "Доска ждёт")), organizationId, null, true, true)).post().id();

		// Ольга — гайд о зарядке во дворе.
		var yoga = blog.uploadPhoto(olga, DemoAlbumSeeder.image("yoga"));
		var olgaGuide = blog.create(olga, new BlogPostRequest(BlogPostType.GUIDE, null, null,
				"Зарядка во дворе после 60: с чего начать", """
						Третий год каждое утро выхожу во двор, и соседи понемногу подтягиваются. Делюсь, как начать.

						## Почему утро

						Воздух свежее, двор пустой, а день потом идёт бодрее. *Вечером* всегда находятся дела.

						## Пять упражнений без коврика

						1. Наклоны головы — медленно, по 5 раз.
						2. Круги плечами вперёд и назад.
						3. Повороты корпуса, руки на поясе.
						4. Шаги на месте с высоким подниманием колен.
						5. Глубокий вдох — руки вверх, выдох — вниз.

						> Главное правило — без рывков и через улыбку.

						Создайте встречу «Зарядка во дворе» — кто-нибудь обязательно придёт.""",
				List.of(new BlogPhotoRequest(yoga.id(), "Наш двор в 8 утра")), null, null, true, true)).post().id();

		// Лайки и обсуждение.
		var posts = new ArrayList<UUID>(List.of(ladyaGuide, olgaGuide));
		if (annaPost != null) posts.add(annaPost);
		if (petrPost != null) posts.add(petrPost);
		for (var post : posts) {
			for (var username : List.of("anna", "petr", "olga", "dmitry", "elena", "sergey", "nikolai", "vika")) {
				var id = cast.id(username);
				if (id != null && (post.hashCode() + username.hashCode()) % 3 != 0) {
					blog.like(post, id);
				}
			}
		}
		var question = comments.create(ladyaGuide, olga,
				"А можно прийти, если мне 67 и я последний раз играла с внуком лет пять назад?", null);
		comments.create(ladyaGuide, ladya,
				"Конечно! На открытом уроке посадим вас с тренером — он как раз любит объяснять.", question.id());
		comments.create(olgaGuide, anna, "Попробовала сегодня утром — бодрит! Спасибо за список.", null);
		if (annaPost != null) {
			var ask = comments.create(annaPost, cast.id("elena"), "Классный отчёт! Сколько по времени заняла встреча?", null);
			comments.create(annaPost, anna, "Около полутора часов вместе с разминкой.", ask.id());
		}
		if (petrPost != null) {
			comments.create(petrPost, cast.id("dmitry"), "Отличный вечер, в следующий раз приведу брата.", null);
		}
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
