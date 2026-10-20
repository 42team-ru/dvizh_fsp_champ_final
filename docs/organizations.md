# Публичные организации и подписки

Каталог `/orgs` показывает одобренные клубы. «Все» поддерживает поиск по названию и описанию,
город и вид спорта; «Мои» объединяет подписки и посещённые клубы, помечая обе причины.
Ссылка есть в шапке и меню аккаунта, доступном также в мобильной верхней панели. Нижняя панель сохраняет прежние пять действий.

Страница `/orgs/:id` открывает профиль и сводку двумя запросами. Встречи, статистика,
расписание и места учитывают только PUBLISHED-события одобренной организации и SCHEDULED-занятия.
Архив и галерея имеют отдельную пагинацию, загрузка начинается по действию посетителя.

| Метод и путь | operationId | Ответ |
| --- | --- | --- |
| GET `/api/organizations` | `organizations_list` | `PageResponse<OrganizationCardResponse>`; `searchText`, `city`, `sportId`, `mine`, `page`, `size` |
| GET `/api/organizations/cities` | `organizations_cities` | Города одобренных организаций |
| GET `/api/organizations/{id}` | `organizations_get` | Существующий профиль, награды, документы, контакты |
| GET `/api/organizations/{id}/overview` | `organizations_overview` | Статистика, месяцы, команда, места, расписание, подписка и первые страницы |
| GET `/api/organizations/{id}/meetings` | `organizations_pastMeetings` | `PageResponse<OrganizationMeetingResponse>`; `sportId`, `page`, `size` |
| GET `/api/organizations/{id}/photos` | `organizations_photos` | `PageResponse<FileResponse>`; `page`, `size` |
| POST `/api/organizations/{id}/subscription` | `organizations_subscribe` | Состояние подписки, число и до четырёх аватаров |
| DELETE `/api/organizations/{id}/subscription` | `organizations_unsubscribe` | То же; повторный запрос безопасен |

Все запросы требуют входа. Подписаться и отписаться может USER; ORG/ADMIN получают 409 с русским
объяснением. Неодобренная организация даёт 404, в том числе при отозванном допуске.
Публичный каталог и «Мои» такие организации скрывают. Номер страницы от нуля, размер 1–100.

Миграция **V36__organization_subscriptions.sql** создаёт UUID-сущность с аудитом,
внешними ключами и уникальной парой `(organization_id, user_id)`. Команды подписки берут блокировку
организации, поэтому параллельные повторные запросы не создают дубли.

При создании события от организации `NotificationSubjects` публикует `ORG_NEW_EVENT` в категории
ORGANIZATIONS с ключом дедупликации по событию, русским текстом и ссылкой `/events/{id}`.
Входящие и outbox создаются в транзакции события существующим `NotificationPublisher`.
Тип включён в «Активность» и её счётчик. Демо подписывает Анну и массовку на «Ладью» и ещё два клуба,
Ольгу — на «Ладью»; все подписки идут через сервис.

## Как считаются показатели

- Проведённые встречи — завершившиеся занятия; без endAt конец равен startAt + 2 часа,
  как в существующем `MeetingAttendance`. Разовая встреча — одно занятие, серия — несколько.
- Участники за год — разные участники проведённых занятий, начавшихся в последние 365 дней.
  У разовых встреч берём CONFIRMED-записи, у серий — отметки на конкретные занятия.
- Возвращаемость — доля разных участников всей истории с двумя и более посещениями.
  До пяти разных участников API возвращает null, карточка скрыта.
- Фото — EVENT_PHOTO + ALBUM_PHOTO событий клуба; «из M встреч» — число разных событий с фото,
  поскольку фотографии в текущей модели привязаны к событию, а не к конкретной дате серии.
- График — текущий месяц и 11 предыдущих. Месяц занятия определяется его часовым поясом;
  границы шкалы — в календарном поясе проекта `MeetingAttendance.ZONE`.
- Расписание — ближайшее занятие каждого дня недели в следующие 28 дней, местное время события.
- Команда — авторы и принятые EventOrganizer, без собственного аккаунта клуба;
  счётчик отражает все публичные неотменённые занятия, которые человек ведёт.
- Места — четыре самых частых адреса среди публичных неотменённых занятий.

## Соответствие макету

Используются существующие Memphis-токены, Unbounded/Manrope, shadcn/ui и картинки из API.
Иллюстрация наград вынесена в общий `AchievementPicture` и используется также в профиле человека.
Отзывы, рейтинг и звёзды не реализованы, поскольку в продукте нет отзывов. Вместо рейтинга — число фото.
Подсказка о вымышленном клубном штампе не добавлена: такой награды в модели нет.
Если нет команды, расписания, документов или контактов, пустой блок скрывается; низкая выборка скрывает процент.

Покрытие — три сценария `OrganizationSubscriptionsE2ETest`, через `TestApi`/`Actor`:
подписка и уведомление с правами и идемпотентностью; каталог и «Мои»; статистика и модерация.

## Основные файлы

- API: `backend/src/main/java/com/hackathon/app/rest/OrganizationController.java`.
- Расчёты и каталог: `service/OrganizationOverviewService.java`; подписки: `service/OrganizationSubscriptionService.java`.
- Хранение: `domain/entity/OrganizationSubscription.java`, `repository/OrganizationSubscriptionRepository.java`,
  `domain/mapper/OrganizationSubscriptionMapper.java`, `db/migration/V36__organization_subscriptions.sql`.
  Все эти пути относятся к существующим слоям бэкенда.
- Уведомления: `service/EventService.java`, `service/NotificationSubjects.java`, `domain/enums/NotificationType.java`.
- Страница: `frontend/src/pages/org-public/ui/org-public-page.tsx`; блоки в `frontend/src/widgets/organization-{header,meetings,sidebar,photos}`.
- Каталог: `frontend/src/pages/orgs-catalog`, тонкий роут `frontend/src/app/routes/orgs-catalog.tsx`.
- Действие: `frontend/src/features/organization-subscription`; общая иллюстрация: `shared/components/ui/achievement-picture.tsx`.
- Контракт: `frontend/src/shared/api/schemas/openapi.json` и `frontend/src/shared/api/generated/core` (экспорт из MockMvc + Orval).
- Сценарии: `backend/src/test/java/com/hackathon/app/e2e/OrganizationSubscriptionsE2ETest.java` и методы `e2e/support/Actor.java`.
