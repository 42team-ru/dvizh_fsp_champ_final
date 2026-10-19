package com.hackathon.app.e2e;

import static com.hackathon.app.domain.enums.ContactType.*;
import static com.hackathon.app.domain.enums.EventStatus.PUBLISHED;
import static com.hackathon.app.domain.enums.OrganizationStatus.*;
import static com.hackathon.app.e2e.support.ApiAssertions.assertThatApi;
import static com.hackathon.app.e2e.support.TestApi.uniqueName;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpStatus.*;

import java.util.Map;

import com.hackathon.app.e2e.support.EventForm;
import com.hackathon.app.e2e.support.OrganizationForm;
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

/** Допуск организации через реальные Security, API и JPA; H2 и контекст общие с остальными E2E. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("h2")
class OrganizationApprovalE2ETest {
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
	 * ФЛОУ: организация подаёт первую анкету, получает допуск и публикует событие без повторной модерации.
	 * ШАГИ:
	 *   1. Зарегистрировать ORG и войти; до заполнения анкеты кабинет возвращает 404.
	 *   2. Сохранить анкету: PENDING; до допуска публичная страница возвращает 404.
	 *   3. Войти администратором, найти заявку в списке PENDING и проверить аккаунт заявителя.
	 *   4. Одобрить заявку, прочитать APPROVED в кабинете организации с прежним cookie.
	 *   5. Создать событие и открыть публичную страницу и событие обычным USER.
	 * ПРОВЕРЯЕМ: статусы HTTP, items и totalElements списка, account.username, сохранённый допуск,
	 *   organizationId и PUBLISHED у события, название и контакты публичной организации.
	 * ПОЧЕМУ ВАЖНО: это сценарий приёмки допуска клуба; до проверки клуб скрыт, после неё может
	 *   сразу собирать участников, а посетитель видит контакты и опубликованное событие.
	 */
	@Test
	void approvedOrganizationPublishesEventAndBecomesVisibleToUser() {
		// 1. До анкеты кабинета нет; до допуска нет публичной страницы.
		var org = api.newOrganization("org");
		assertThatApi(org::myOrganization).fails(NOT_FOUND);
		var name = uniqueName("Клуб ");
		var contacts = Map.of(PHONE, "+79001234567", EMAIL, "club@example.com");
		var saved = org.submitOrganization(OrganizationForm.valid().name(name)
				.contact("PHONE", contacts.get(PHONE)).contact("EMAIL", contacts.get(EMAIL)));
		assertThat(saved.status()).isEqualTo(PENDING);
		var id = saved.id();
		assertThatApi(() -> org.openOrganization(id)).fails(NOT_FOUND);

		// 2. Админ находит именно эту заявку и допускает клуб.
		var admin = api.newAdmin();
		var applications = admin.adminOrganizations("PENDING", name);
		assertThat(applications.totalElements()).isEqualTo(1);
		assertThat(applications.items()).singleElement().satisfies(application -> {
			assertThat(application.id()).isEqualTo(id);
			assertThat(application.status()).isEqualTo(PENDING);
			assertThat(application.account().username()).isEqualTo(org.username());
		});
		assertThat(admin.approveOrganization(id).status()).isEqualTo(APPROVED);
		assertThat(org.myOrganization().status()).isEqualTo(APPROVED);

		// 3. Прежняя сессия сразу позволяет публиковать; посетитель видит клуб и событие.
		var event = org.createEvent(EventForm.free());
		assertThat(event.organizationId()).isEqualTo(id);
		assertThat(event.status()).isEqualTo(PUBLISHED);
		var user = api.newUser("user");
		var page = user.openOrganization(id);
		assertThat(page.name()).isEqualTo(name);
		assertThat(page.contacts()).containsAllEntriesOf(contacts);
		var card = user.openEvent(event.id());
		assertThat(card.organizationId()).isEqualTo(id);
		assertThat(card.status()).isEqualTo(PUBLISHED);
	}

	/**
	 * ФЛОУ: после отказа организация видит причину, исправляет анкету и получает допуск по той же заявке.
	 * ШАГИ:
	 *   1. Зарегистрировать ORG, сохранить анкету и отклонить её администратором с причиной.
	 *   2. Прочитать REJECTED и причину в кабинете; попытаться создать валидное событие — 403.
	 *   3. Изменить название и контакты: статус снова PENDING, идентификатор анкеты прежний.
	 *   4. Одобрить исправленную заявку и заново прочитать кабинет организации.
	 * ПРОВЕРЯЕМ: сохранение причины отказа, запрет публикации, повторную подачу без новой организации,
	 *   итоговый APPROVED и очистку rejectReason в ответе администратора и кабинете ORG.
	 * ПОЧЕМУ ВАЖНО: отказ должен объяснять проблему и позволять исправление; старый отказ не должен
	 *   запрещать публикацию навсегда или показываться как действующее решение после допуска.
	 */
	@Test
	void rejectedOrganizationResubmitsQuestionnaireAndGetsApproved() {
		// 1. Отказ виден клубу и закрывает публикацию.
		var org = api.newOrganization("org");
		var admin = api.newAdmin();
		var id = org.submitOrganization(OrganizationForm.valid().contact("PHONE", "+79001234567")).id();
		var reason = "Уточните контактный телефон клуба";
		assertThat(admin.rejectOrganization(id, reason).status()).isEqualTo(REJECTED);
		var rejected = org.myOrganization();
		assertThat(rejected.status()).isEqualTo(REJECTED);
		assertThat(rejected.rejectReason()).isEqualTo(reason);
		assertThatApi(() -> org.createEvent(EventForm.free())).fails(FORBIDDEN);

		// 2. Исправление повторно подаёт ту же анкету.
		var correctedName = uniqueName("Исправленный клуб ");
		var resubmitted = org.submitOrganization(OrganizationForm.valid().name(correctedName).contact("PHONE", "+79007654321"));
		assertThat(resubmitted.id()).isEqualTo(id);
		assertThat(resubmitted.status()).isEqualTo(PENDING);
		var pending = org.myOrganization();
		assertThat(pending.id()).isEqualTo(id);
		assertThat(pending.name()).isEqualTo(correctedName);
		assertThat(pending.contacts()).containsEntry(PHONE, "+79007654321");
		assertThat(pending.status()).isEqualTo(PENDING);

		// 3. Одобрение очищает прежнюю причину отказа у обеих сторон.
		var approved = admin.approveOrganization(id);
		assertThat(approved.status()).isEqualTo(APPROVED);
		assertThat(approved.rejectReason()).isNull();
		var mine = org.myOrganization();
		assertThat(mine.status()).isEqualTo(APPROVED);
		assertThat(mine.rejectReason()).isNull();
	}

	/**
	 * ФЛОУ: роли ограничивают доступ к кабинету и модерации, некорректные анкета и отказ не сохраняются.
	 * ШАГИ:
	 *   1. Войти как USER, ADMIN и ORG; проверить запрет кабинета ORG для USER и ADMIN.
	 *   2. Проверить запрет списка заявок для USER и создания валидного события администратором.
	 *   3. Отправить от ORG анкету с неверным телефоном, затем с пустыми contacts — обе дают 400.
	 *   4. Убедиться, что анкеты ещё нет; создать валидную и отклонить без reason — 400.
	 *   5. Повторно прочитать кабинет: заявка осталась PENDING, причины отказа нет.
	 * ПРОВЕРЯЕМ: 403 при нарушении прав, 400 при неверных данных и отсутствие изменения состояния
	 *   после ошибочных запросов; проверки выполняются через настоящий JWT из cookie и Security.
	 * ПОЧЕМУ ВАЖНО: скрытых кнопок недостаточно — API обязан защищать роли, требовать рабочий контакт
	 *   для участников и объяснение отказа для организации.
	 */
	@Test
	void roleRestrictionsAndInvalidQuestionnaireOrDecisionAreEnforced() {
		// 1. Права кабинета и модерации разделены по ролям.
		var user = api.newUser("user");
		var admin = api.newAdmin();
		var org = api.newOrganization("org");
		assertThatApi(user::myOrganization).fails(FORBIDDEN);
		assertThatApi(admin::myOrganization).fails(FORBIDDEN);
		assertThatApi(() -> user.adminOrganizations(null, null)).fails(FORBIDDEN);
		assertThatApi(() -> admin.createEvent(EventForm.free())).fails(FORBIDDEN);

		// 2. Невалидные контакты не создают анкету.
		var form = OrganizationForm.valid().contact("PHONE", "not-a-phone");
		assertThatApi(() -> org.submitOrganization(form)).fails(BAD_REQUEST);
		assertThatApi(() -> org.submitOrganization(form.noContacts())).fails(BAD_REQUEST);
		assertThatApi(org::myOrganization).fails(NOT_FOUND);

		// 3. Отказ без причины не меняет существующую заявку.
		var id = org.submitOrganization(form.contact("EMAIL", "club@example.com")).id();
		assertThatApi(() -> admin.rejectOrganization(id, Map.of())).fails(BAD_REQUEST);
		var unchanged = org.myOrganization();
		assertThat(unchanged.status()).isEqualTo(PENDING);
		assertThat(unchanged.rejectReason()).isNull();
	}
}
