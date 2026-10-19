package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.EventStatus.*;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.e2e.support.OrganizationForm;
import com.hackathon.app.domain.enums.NotificationType;
import com.hackathon.app.domain.dto.CommentResponse;
import com.hackathon.app.e2e.support.Actor;
import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.TestApi;
import com.hackathon.app.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

/** Сценарий приёмки 5: уточнение условий без записи на мероприятие. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class CommentsE2ETest {
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
	 * ФЛОУ: ещё не записанный человек задаёт вопрос, организатор отвечает, оба читают обсуждение.
	 * ШАГИ:
	 *   1. Войти двумя USER, создать событие и проверить пустое обсуждение и отсутствие записи читателя.
	 *   2. Отправить вопрос читателем и ответ автором, сохранить идентификаторы комментариев.
	 *   3. Перечитать ветку обоими пользователями и проверить порядок, тексты, авторов и метки.
	 *   4. Убедиться, что обсуждение не записало читателя на событие.
	 * ПРОВЕРЯЕМ: 201, сохранение обоих сообщений, различимые id и username авторов,
	 *   isOrganizer только у ответа и отсутствие регистрации до и после разговора.
	 * ПОЧЕМУ ВАЖНО: условия нужно уточнить до записи; метка отличает ответ организатора от совета посетителя.
	 */
	@Test
	void unregisteredUserAsksAndOrganizerAnswersInChronologicalThread() {
		// 1. Посетитель пока не записан, обсуждение пусто.
		var author = api.newUser("author");
		var reader = api.newUser("reader");
		var id = author.createEvent(EventForm.free()).id();
		assertThat(reader.comments(id)).isEmpty();
		assertNotRegistered(reader, id);

		// 2. Вопрос без записи и ответ автора получают разные метки.
		var questionText = "Можно прийти без своих шиповок?";
		var answerText = "Да, достаточно удобных кроссовок";
		var question = reader.comment(id, questionText);
		var answer = author.comment(id, answerText);
		assertThat(question.isOrganizer()).isFalse();
		assertThat(answer.isOrganizer()).isTrue();
		var readerId = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(reader.username(), reader.username()).orElseThrow().getId();
		var authorId = users.findByUsernameIgnoreCaseOrEmailIgnoreCase(author.username(), author.username()).orElseThrow().getId();

		// 3. Обе стороны видят авторство и полную ветку в хронологическом порядке.
		for (var viewer : List.of(reader, author)) {
			var thread = viewer.comments(id);
			assertThat(thread).extracting(CommentResponse::id).containsExactly(question.id(), answer.id());
			assertMessage(thread.get(0), question.id(), questionText, readerId, reader.username(), false);
			assertMessage(thread.get(1), answer.id(), answerText, authorId, author.username(), true);
		}
		assertNotRegistered(reader, id);
	}

	/**
	 * ФЛОУ: аноним и некорректный текст не оставляют сообщений, несуществующее событие не имеет обсуждения.
	 * ШАГИ:
	 *   1. Создать событие; отправить валидный комментарий без cookie — 401.
	 *   2. Войти автором, отправить пустой, пробельный и превышающий 2000 символов текст — 400.
	 *   3. Перечитать обсуждение: ничего не сохранено; отправить допустимый короткий текст — 201.
	 *   4. Запросить и отправить комментарий для случайного UUID — 404; перечитать прежнюю ветку.
	 *   5. Отправить ровно 2000 символов — ожидаем 201 по контракту CommentRequest.
	 * ПРОВЕРЯЕМ: настоящую аутентификацию, обе стороны ограничения длины, 404 для GET и POST,
	 *   отсутствие побочных сообщений после отказов и сохранение обоих допустимых текстов.
	 * ПОЧЕМУ ВАЖНО: отказ API не должен оставлять мусор, а допустимая граница не должна блокировать вопрос.
	 */
	@Test
	void authenticationValidationAndUnknownEventDoNotLeaveComments() {
		// 1. Без входа писать нельзя, невалидные тексты не сохраняются.
		var author = api.newUser("author");
		var id = author.createEvent(EventForm.free()).id();
		assertThatApi(() -> api.guest().comment(id, "Где встречаемся?")).fails(UNAUTHORIZED);
		for (var text : List.of("", " \n\t ", "я".repeat(2001))) {
			assertThatApi(() -> author.comment(id, text)).fails(BAD_REQUEST);
		}
		assertThat(author.comments(id)).isEmpty();
		var text = "Где встречаемся?";
		var commentId = author.comment(id, text).id();

		// 2. Неизвестное событие не допускает чтения и записи; прежняя ветка цела.
		var unknown = UUID.randomUUID();
		assertThatApi(() -> author.comments(unknown)).fails(NOT_FOUND, "Мероприятие не найдено");
		assertThatApi(() -> author.comment(unknown, text)).fails(NOT_FOUND, "Мероприятие не найдено");
		assertThat(author.comments(id)).singleElement().satisfies(comment -> {
			assertThat(comment.id()).isEqualTo(commentId);
			assertThat(comment.text()).isEqualTo(text);
		});

		// 3. Ровно 2000 символов сохраняются целиком на втором месте ветки.
		var boundaryText = "я".repeat(2000);
		var boundaryId = author.comment(id, boundaryText).id();
		var thread = author.comments(id);
		assertThat(thread).hasSize(2);
		assertThat(thread.get(1).id()).isEqualTo(boundaryId);
		assertThat(thread.get(1).text()).isEqualTo(boundaryText);
	}

	/**
	 * ФЛОУ: снятие с публикации оставляет обсуждение открытым, удаление сохраняет историю и закрывает запись.
	 * ШАГИ:
	 *   1. Создать событие и вопрос посетителя, затем снять событие администратором.
	 *   2. Ответить организатором в UNPUBLISHED — 201; прочитать оба сообщения посетителем.
	 *   3. Удалить событие, попробовать написать посетителем и автором — 409.
	 *   4. Обоими аккаунтами перечитать прежние два сообщения без новых записей.
	 * ПРОВЕРЯЕМ: фактическую политику CommentService/EventAccessPolicy: UNPUBLISHED разрешает запись,
	 *   DELETED разрешает чтение и отвечает русской причиной запрета нового комментария.
	 * ПОЧЕМУ ВАЖНО: обсуждение объясняет произошедшее участникам и не должно исчезать вместе с публикацией.
	 */
	@Test
	void unpublishedDiscussionStaysOpenAndDeletedDiscussionBecomesReadOnly() {
		// 1. Снятие с публикации сохраняет вопрос посетителя.
		var author = api.newUser("author");
		var reader = api.newUser("reader");
		var admin = api.newAdmin();
		var id = author.createEvent(EventForm.free()).id();
		var questionId = reader.comment(id, "Встреча состоится?").id();
		var reason = "Уточнение условий площадки";
		assertThat(admin.unpublishEvent(id, reason).status()).isEqualTo(UNPUBLISHED);

		// 2. В UNPUBLISHED организатор может ответить.
		var answerId = author.comment(id, "Уточняем место, сообщим здесь").id();
		assertThat(reader.comments(id)).extracting(CommentResponse::id).containsExactly(questionId, answerId);

		// 3. DELETED закрывает запись, сохраняя историю обеим сторонам.
		assertThat(admin.deleteEvent(id, reason).status()).isEqualTo(DELETED);
		for (var viewer : List.of(reader, author)) {
			assertThatApi(() -> viewer.comment(id, "Новое сообщение")).fails(CONFLICT, "Мероприятие удалено, обсуждение закрыто");
			assertThat(viewer.comments(id)).extracting(CommentResponse::id).containsExactly(questionId, answerId);
		}
	}

	private void assertMessage(CommentResponse comment, UUID id, String text, UUID authorId, String username, boolean organizer) {
		assertThat(comment.id()).isEqualTo(id);
		assertThat(comment.text()).isEqualTo(text);
		assertThat(comment.author().id()).isEqualTo(authorId);
		assertThat(comment.author().username()).isEqualTo(username);
		assertThat(comment.isOrganizer()).isEqualTo(organizer);
	}

	private void assertNotRegistered(Actor reader, UUID eventId) {
		assertThat(reader.openEvent(eventId).viewer().registrationStatus()).isNull();
		assertThat(reader.myRegistrations()).isEmpty();
	}

	/**
	 * ФЛОУ: участник задаёт вопрос, организатор получает уведомление; админ скрывает некорректное сообщение,
	 *   а потом возвращает его — мероприятие и остальное обсуждение не страдают.
	 * ШАГИ:
	 *   1. Создать событие, задать вопрос читателем и проверить уведомление COMMENT_CREATED у автора.
	 *   2. Админ скрывает вопрос с причиной: проверить, что видят автор вопроса, посторонний и админ.
	 *   3. Попробовать ответить на скрытое, исправить его и скрыть сообщение не админом.
	 *   4. Админ возвращает сообщение: текст снова виден всем.
	 * ПРОВЕРЯЕМ: заглушка (text = null, hidden) у всех, причина — только автору и админу, текст — только админу;
	 *   уведомление автору COMMENT_HIDDEN; ответ и правка — 409, скрытие не админом — 403; возврат снимает скрытие.
	 * ПОЧЕМУ ВАЖНО: ТЗ требует модерацию отдельных сообщений с сохранением мероприятия и остального обсуждения,
	 *   а вопрос участника не должен остаться незамеченным организатором.
	 */
	@Test
	void adminHidesAndRestoresMessageWithoutTouchingRestOfDiscussion() {
		// 1. Вопрос доходит до организатора уведомлением.
		var author = api.newUser("author");
		var reader = api.newUser("reader");
		var stranger = api.newUser("stranger");
		var admin = api.newAdmin();
		var id = author.createEvent(EventForm.free()).id();
		var question = reader.comment(id, "Некорректное сообщение");
		var answer = author.comment(id, "Обычный ответ");
		assertThat(author.notifications().items()).extracting(n -> n.type()).contains(NotificationType.COMMENT_CREATED);

		// 2. Скрытие: заглушка у всех, причина — автору, текст — админу.
		var hidden = admin.hideComment(question.id(), "Оскорбления");
		assertThat(hidden.hidden()).isTrue();
		assertThat(hidden.text()).isEqualTo("Некорректное сообщение");
		var asStranger = stranger.comments(id);
		assertThat(asStranger).extracting(CommentResponse::id).containsExactly(question.id(), answer.id());
		assertThat(asStranger.getFirst().text()).isNull();
		assertThat(asStranger.getFirst().hidden()).isTrue();
		assertThat(asStranger.getFirst().hiddenReason()).isNull();
		assertThat(asStranger.get(1).text()).isEqualTo("Обычный ответ");
		var asAuthor = reader.comments(id).getFirst();
		assertThat(asAuthor.text()).isNull();
		assertThat(asAuthor.hiddenReason()).isEqualTo("Оскорбления");
		assertThat(asAuthor.canEdit()).isFalse();
		assertThat(reader.notifications().items()).extracting(n -> n.type()).contains(NotificationType.COMMENT_HIDDEN);

		// 3. На скрытое не ответить и не исправить; скрывать может только админ.
		assertThatApi(() -> author.reply(id, question.id(), "Ответ")).fails(CONFLICT, "Нельзя ответить на сообщение, скрытое модератором");
		assertThatApi(() -> reader.editComment(id, question.id(), "Исправлено")).fails(CONFLICT, "Сообщение скрыто модератором");
		assertThatApi(() -> author.hideComment(answer.id(), "Не нравится")).fails(FORBIDDEN);

		// 4. Возврат: текст снова у всех.
		assertThat(admin.unhideComment(question.id()).hidden()).isFalse();
		assertThat(stranger.comments(id).getFirst().text()).isEqualTo("Некорректное сообщение");
	}

	/**
	 * ФЛОУ: допущенная организация отвечает в обсуждении своего события — ответ подписан организацией.
	 * ШАГИ: 1. Подать анкету ORG и одобрить. 2. Создать событие от организации. 3. Пользователь спрашивает,
	 *   организация отвечает. 4. Прочитать обсуждение и карточку.
	 * ПРОВЕРЯЕМ: у ответа organization с названием клуба и меткой «Организатор»; у вопроса organization = null;
	 *   в карточке организатор тоже подписан организацией.
	 * ПОЧЕМУ ВАЖНО: сценарий 5 требует различать авторство: «Шахматный клуб», а не имя контактного лица.
	 */
	@Test
	void organizationReplyIsSignedWithOrganizationName() {
		var club = api.newOrganization("club");
		var name = uniqueName("Клуб ");
		var organizationId = club.submitOrganization(OrganizationForm.valid().name(name)).id();
		api.newAdmin().approveOrganization(organizationId);
		var id = club.createEvent(EventForm.free()).id();
		var reader = api.newUser("reader");
		var question = reader.comment(id, "Нужна своя доска?");
		club.reply(id, question.id(), "Доски дадим");

		var thread = reader.comments(id);
		assertThat(thread.getFirst().organization()).isNull();
		assertThat(thread.get(1).isOrganizer()).isTrue();
		assertThat(thread.get(1).organization().id()).isEqualTo(organizationId);
		assertThat(thread.get(1).organization().name()).isEqualTo(name);
		assertThat(reader.openEvent(id).organizers().getFirst().organization().name()).isEqualTo(name);
	}
}
