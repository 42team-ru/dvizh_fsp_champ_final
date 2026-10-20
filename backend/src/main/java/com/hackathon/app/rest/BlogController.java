package com.hackathon.app.rest;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.BlogAuthorResponse;
import com.hackathon.app.domain.dto.BlogCommentRequest;
import com.hackathon.app.domain.dto.BlogCommentResponse;
import com.hackathon.app.domain.dto.BlogCommentUpdateRequest;
import com.hackathon.app.domain.dto.BlogEventResponse;
import com.hackathon.app.domain.dto.BlogLikeResponse;
import com.hackathon.app.domain.dto.BlogPostRequest;
import com.hackathon.app.domain.dto.BlogPostResponse;
import com.hackathon.app.domain.dto.BlogPostSummaryResponse;
import com.hackathon.app.domain.dto.BlogPromptResponse;
import com.hackathon.app.domain.dto.FileResponse;
import com.hackathon.app.domain.dto.PageResponse;
import com.hackathon.app.domain.enums.BlogPostStatus;
import com.hackathon.app.domain.enums.BlogPostType;
import com.hackathon.app.service.BlogCommentService;
import com.hackathon.app.service.BlogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@Tag(name = "blog", description = "Блог: гайды и посты с тренировок, фото, лайки, комментарии, виджет «Наши тренировки»")
@RestController
@RequestMapping(path = "/api/blog", produces = MediaType.APPLICATION_JSON_VALUE)
@RequiredArgsConstructor
class BlogController {

	private final BlogService blog;
	private final BlogCommentService comments;

	@GetMapping("/posts")
	@Operation(operationId = "blog_list", summary = "Лента блога",
			description = "Только опубликованные, новые сверху. organizationId — «блог клуба»: посты его аккаунта и о его встречах; "
					+ "eventId — посты участников встречи; authorId — посты человека. size до 50.")
	PageResponse<BlogPostSummaryResponse> list(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(required = false) BlogPostType type, @RequestParam(required = false) UUID sportId,
			@RequestParam(required = false) UUID authorId, @RequestParam(required = false) UUID eventId,
			@RequestParam(required = false) UUID organizationId,
			@Parameter(description = "Поиск по заголовку и тексту") @RequestParam(required = false) String searchText,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		log.info("Endpoint called: GET /api/blog/posts, userId={}, type={}, sportId={}, authorId={}, eventId={}, organizationId={}, searchText={}, page={}, size={}",
				jwt.getSubject(), type, sportId, authorId, eventId, organizationId, searchText, page, size);
		var response = blog.list(type, sportId, authorId, eventId, organizationId, searchText, page, size, userId(jwt));
		log.info("Endpoint response: GET /api/blog/posts, count={}, total={}", response.items().size(), response.totalElements());
		return response;
	}

	@GetMapping("/posts/mine")
	@Operation(operationId = "blog_mine", summary = "Мои посты: черновики и опубликованные", description = "Свежие правки сверху.")
	PageResponse<BlogPostSummaryResponse> mine(@AuthenticationPrincipal Jwt jwt,
			@RequestParam(required = false) BlogPostStatus status,
			@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
		log.info("Endpoint called: GET /api/blog/posts/mine, userId={}, status={}, page={}, size={}", jwt.getSubject(), status, page, size);
		var response = blog.mine(userId(jwt), status, page, size);
		log.info("Endpoint response: GET /api/blog/posts/mine, count={}", response.items().size());
		return response;
	}

	@GetMapping("/posts/{id}")
	@Operation(operationId = "blog_get", summary = "Пост целиком", description = "Черновик видит только автор. viewer — что я могу сделать.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "404", description = "Поста нет или это чужой черновик", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	BlogPostResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: GET /api/blog/posts/{}, userId={}", id, jwt.getSubject());
		var response = blog.get(id, userId(jwt));
		log.info("Endpoint response: GET /api/blog/posts/{}, status={}", id, response.post().status());
		return response;
	}

	@PostMapping(path = "/posts", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "blog_create", summary = "Написать пост",
			description = "Гайд — без встречи. Пост с тренировки — о начавшейся встрече, где я участник или организатор. "
					+ "publish = false — сохранить черновиком.")
	@ApiResponse(responseCode = "400", description = "Не заполнено, чужое фото, виджет и клуба и организатора", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "403", description = "Админ, неодобренный клуб или меня не было на встрече", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "409", description = "Встреча ещё не прошла или удалена", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.CREATED)
	BlogPostResponse create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody BlogPostRequest request) {
		log.info("Endpoint called: POST /api/blog/posts, userId={}, type={}, eventId={}, photos={}, publish={}", jwt.getSubject(),
				request.type(), request.eventId(), request.photos() == null ? 0 : request.photos().size(), request.publish());
		var response = blog.create(userId(jwt), request);
		log.info("Endpoint response: POST /api/blog/posts, id={}, status={}", response.post().id(), response.post().status());
		return response;
	}

	@PutMapping(path = "/posts/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "blog_update", summary = "Исправить свой пост", description = "Заменяет пост целиком, включая фото.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "403", description = "Чужой пост", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ApiResponse(responseCode = "404", description = "Поста нет", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	BlogPostResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody BlogPostRequest request) {
		log.info("Endpoint called: PUT /api/blog/posts/{}, userId={}, type={}, eventId={}, publish={}", id, jwt.getSubject(),
				request.type(), request.eventId(), request.publish());
		var response = blog.update(id, userId(jwt), request);
		log.info("Endpoint response: PUT /api/blog/posts/{}, status={}", id, response.post().status());
		return response;
	}

	@DeleteMapping("/posts/{id}")
	@Operation(operationId = "blog_delete", summary = "Удалить пост", description = "Автор или админ; вместе с лайками и комментариями.")
	@ApiResponse(responseCode = "403", description = "Чужой пост", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void delete(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: DELETE /api/blog/posts/{}, userId={}", id, jwt.getSubject());
		blog.delete(id, userId(jwt));
		log.info("Endpoint response: DELETE /api/blog/posts/{}, status=204", id);
	}

	@PostMapping("/posts/{id}/like")
	@Operation(operationId = "blog_like", summary = "Лайкнуть пост", description = "Повторный лайк ничего не меняет.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "409", description = "Черновик или админ", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	BlogLikeResponse like(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: POST /api/blog/posts/{}/like, userId={}", id, jwt.getSubject());
		var response = blog.like(id, userId(jwt));
		log.info("Endpoint response: POST /api/blog/posts/{}/like, response={}", id, response);
		return response;
	}

	@DeleteMapping("/posts/{id}/like")
	@Operation(operationId = "blog_unlike", summary = "Убрать лайк")
	BlogLikeResponse unlike(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: DELETE /api/blog/posts/{}/like, userId={}", id, jwt.getSubject());
		var response = blog.unlike(id, userId(jwt));
		log.info("Endpoint response: DELETE /api/blog/posts/{}/like, response={}", id, response);
		return response;
	}

	@PostMapping(path = "/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	@Operation(operationId = "blog_uploadPhoto", summary = "Загрузить фото для поста (JPG, PNG, WebP до 5 МБ)",
			description = "Файл попадёт в пост, когда его id придёт в photos при сохранении.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "400", description = "Неверный формат или размер", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	FileResponse uploadPhoto(@AuthenticationPrincipal Jwt jwt, @Parameter(description = "Фото") @RequestPart("file") MultipartFile file) {
		log.info("Endpoint called: POST /api/blog/photos, userId={}, request={}", jwt.getSubject(), Uploads.describe(file));
		var response = blog.uploadPhoto(userId(jwt), Uploads.of(file));
		log.info("Endpoint response: POST /api/blog/photos, fileId={}", response.id());
		return response;
	}

	@GetMapping("/eligible-events")
	@Operation(operationId = "blog_eligibleEvents", summary = "О каких встречах я могу написать",
			description = "Начались, не удалены, я организатор или подтверждённый участник. Свежие сверху.")
	List<BlogEventResponse> eligibleEvents(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/blog/eligible-events, userId={}", jwt.getSubject());
		var response = blog.eligibleEvents(userId(jwt));
		log.info("Endpoint response: GET /api/blog/eligible-events, count={}", response.size());
		return response;
	}

	@GetMapping("/events/{eventId}/photos")
	@Operation(operationId = "blog_eventPhotos", summary = "Фото встречи для поста", description = "Альбомы участников и фото мероприятия.")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "403", description = "Меня не было на встрече", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	List<FileResponse> eventPhotos(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID eventId) {
		log.info("Endpoint called: GET /api/blog/events/{}/photos, userId={}", eventId, jwt.getSubject());
		var response = blog.eventPhotos(eventId, userId(jwt));
		log.info("Endpoint response: GET /api/blog/events/{}/photos, count={}", eventId, response.size());
		return response;
	}

	@GetMapping("/prompt")
	@Operation(operationId = "blog_prompt", summary = "«Как прошла встреча? Напиши пост»",
			description = "Последняя закончившаяся за неделю встреча, где я был и о которой ещё не писал. Пустой ответ — предлагать нечего.")
	BlogPromptResponse prompt(@AuthenticationPrincipal Jwt jwt) {
		log.info("Endpoint called: GET /api/blog/prompt, userId={}", jwt.getSubject());
		var response = blog.prompt(userId(jwt));
		log.info("Endpoint response: GET /api/blog/prompt, eventId={}", response == null ? null : response.event().id());
		return response;
	}

	@GetMapping("/authors")
	@Operation(operationId = "blog_topAuthors", summary = "Авторы недели", description = "Больше всех публиковали за последний месяц.")
	List<BlogAuthorResponse> topAuthors(@AuthenticationPrincipal Jwt jwt, @RequestParam(defaultValue = "3") int limit) {
		log.info("Endpoint called: GET /api/blog/authors, userId={}, limit={}", jwt.getSubject(), limit);
		var response = blog.topAuthors(limit);
		log.info("Endpoint response: GET /api/blog/authors, count={}", response.size());
		return response;
	}

	@GetMapping("/posts/{id}/comments")
	@Operation(operationId = "blog_comments", summary = "Комментарии под постом", description = "Старые сверху; replyTo — цитата.")
	List<BlogCommentResponse> comments(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id) {
		log.info("Endpoint called: GET /api/blog/posts/{}/comments, userId={}", id, jwt.getSubject());
		var response = comments.list(id, userId(jwt));
		log.info("Endpoint response: GET /api/blog/posts/{}/comments, count={}", id, response.size());
		return response;
	}

	@PostMapping(path = "/posts/{id}/comments", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "blog_addComment", summary = "Написать комментарий или ответить на комментарий")
	@ApiResponse(responseCode = "409", description = "Черновик, комментарии закрыты или ответ на удалённое", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.CREATED)
	BlogCommentResponse addComment(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @Valid @RequestBody BlogCommentRequest request) {
		log.info("Endpoint called: POST /api/blog/posts/{}/comments, userId={}, request={}", id, jwt.getSubject(), request);
		var response = comments.create(id, userId(jwt), request.text(), request.replyToId());
		log.info("Endpoint response: POST /api/blog/posts/{}/comments, commentId={}", id, response.id());
		return response;
	}

	@PutMapping(path = "/posts/{id}/comments/{commentId}", consumes = MediaType.APPLICATION_JSON_VALUE)
	@Operation(operationId = "blog_updateComment", summary = "Исправить свой комментарий")
	@ApiResponse(responseCode = "200", description = "OK")
	@ApiResponse(responseCode = "403", description = "Чужой комментарий", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	BlogCommentResponse updateComment(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID commentId,
			@Valid @RequestBody BlogCommentUpdateRequest request) {
		log.info("Endpoint called: PUT /api/blog/posts/{}/comments/{}, userId={}, request={}", id, commentId, jwt.getSubject(), request);
		var response = comments.update(id, commentId, userId(jwt), request.text());
		log.info("Endpoint response: PUT /api/blog/posts/{}/comments/{}, editedAt={}", id, commentId, response.editedAt());
		return response;
	}

	@DeleteMapping("/posts/{id}/comments/{commentId}")
	@Operation(operationId = "blog_deleteComment", summary = "Удалить свой комментарий", description = "Мягко: ответы остаются.")
	@ApiResponse(responseCode = "403", description = "Чужой комментарий", content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
	@ResponseStatus(HttpStatus.NO_CONTENT)
	void deleteComment(@AuthenticationPrincipal Jwt jwt, @PathVariable UUID id, @PathVariable UUID commentId) {
		log.info("Endpoint called: DELETE /api/blog/posts/{}/comments/{}, userId={}", id, commentId, jwt.getSubject());
		comments.delete(id, commentId, userId(jwt));
		log.info("Endpoint response: DELETE /api/blog/posts/{}/comments/{}, status=204", id, commentId);
	}

	private static UUID userId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}
}
