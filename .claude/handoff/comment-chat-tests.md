# Хендофф: тесты на обсуждение-чат (ответы, правка, удаление)

Код фичи готов (бэкенд), тестов на новые возможности нет. По правилам `CLAUDE.md` тесты пишет Codex.
Запуск: в Claude Code `/codex:rescue --background` и вставить блок «Задача» ниже целиком; результат — `/codex:status`, `/codex:result`.
Приёмка: прочитать диф (Javadoc ФЛОУ/ШАГИ/ПРОВЕРЯЕМ/ПОЧЕМУ ВАЖНО, только тестовый API, production-код не тронут), `cd backend && ./gradlew test`, после — `./gradlew postgresTest` (новая миграция V13).

## Задача

> Скопировать отсюда и до конца файла.

Допиши тесты на обсуждение под мероприятием, которое стало чатом. Следуй разделу «Тесты» в `CLAUDE.md`: тесты пишутся через тестовый API `e2e/support` (`TestApi`, `Actor`, `ApiAssertions`); нужных действий нет — добавь в `Actor` методы `reply(eventId, replyToId, text)`, `editComment(eventId, commentId, text)`, `deleteComment(eventId, commentId)`, `commentsAfter(eventId, after)`. Расширяй существующий `CommentsE2ETest`, 2–3 новых теста, не больше. Production-код не меняй; если упираешься в баг — опиши: что, как воспроизвести, где в коде.

**Что смотреть** (`backend/src/main/java/com/hackathon/app/`): `rest/CommentController.java`, `service/CommentService.java`, `service/EventAccessPolicy.java` (`replyBlockedReason`, `commentEditBlockedReason` — точные тексты отказов), `domain/dto/CommentResponse.java`, `CommentReplyResponse.java`, `domain/mapper/CommentMapper.java` (цитата до 140 символов, у удалённого `text = null`).

**Ручки:** `GET /api/events/{id}/comments?after=` · `POST /api/events/{id}/comments` `{"text", "replyToId"?}` · `PUT /api/events/{id}/comments/{commentId}` `{"text"}` · `DELETE /api/events/{id}/comments/{commentId}` (204).

**Что покрыть:**
1. Ветка ответов, счастливый путь: посетитель спрашивает → организатор отвечает с `replyToId` (в ответе `replyTo.id/author/text` — цитата вопроса, `isOrganizer = true`) → посетитель отвечает на ответ. В ленте: `repliesCount` у вопроса и ответа, `isMine`/`canEdit` true только у своих сообщений для каждого зрителя, порядок по `createdAt`; `?after=<createdAt вопроса>` возвращает только последующие. Цитата длинного (> 140 символов) сообщения обрезана с «…».
2. Правка и удаление: автор исправляет своё — `editedAt` появился, текст новый; чужое править и удалять — 403 «Изменить можно только своё сообщение»; удаление своего — 204, в ленте `deleted = true`, `text = null`, `canEdit = false`, ответы на него остались и в их `replyTo` — `deleted = true`, `text = null`; повторное удаление и правка удалённого — 409 «Сообщение уже удалено»; ответ на удалённое — 409 «Нельзя ответить на удалённое сообщение».
3. Границы: `replyToId` из другого мероприятия или несуществующий — 400 «Сообщение, на которое вы отвечаете, не найдено»; несуществующий `commentId` — 404 «Сообщение не найдено»; после удаления мероприятия админом править и удалять свои сообщения нельзя (409 «Мероприятие удалено, обсуждение закрыто»), читать ленту можно.
