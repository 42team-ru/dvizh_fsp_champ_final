package com.hackathon.app.service;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.domain.dto.BlogCommentResponse;
import com.hackathon.app.domain.dto.OrganizationShortResponse;
import com.hackathon.app.domain.entity.AppUser;
import com.hackathon.app.domain.entity.BlogComment;
import com.hackathon.app.domain.entity.BlogPost;
import com.hackathon.app.domain.entity.Organization;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.exception.ConflictException;
import com.hackathon.app.domain.exception.ForbiddenException;
import com.hackathon.app.domain.mapper.BlogMapper;
import com.hackathon.app.domain.mapper.OrganizationMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.BlogCommentRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.OrganizationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Комментарии под постом блога: по порядку, ответ на конкретный комментарий (цитата над ответом), правка и мягкое
 * удаление своего. Пишет любой вошедший, пока пост опубликован и автор не закрыл комментарии (BlogAccessPolicy).
 */
@Service
@RequiredArgsConstructor
public class BlogCommentService {

	static final String NOT_FOUND = "Комментарий не найден";

	private final BlogCommentRepository comments;
	private final BlogService posts;
	private final AppUserRepository users;
	private final OrganizationRepository organizations;
	private final OrganizationMapper organizationMapper;
	private final BlogAccessPolicy policy;
	private final BlogMapper mapper;
	private final DbTimeRepository dbTime;

	/** Старые сверху, как в переписке. */
	@Transactional(readOnly = true)
	public List<BlogCommentResponse> list(UUID postId, UUID userId) {
		var post = posts.visible(postId, userId);
		return toResponses(post, comments.findByPostIdOrderByCreatedAt(postId), userId);
	}

	/** Новый комментарий; replyToId — ответ на комментарий этого же поста. */
	@Transactional
	public BlogCommentResponse create(UUID postId, UUID userId, String text, UUID replyToId) {
		var post = posts.visible(postId, userId);
		String reason;
		if (replyToId == null) {
			reason = policy.commentBlockedReason(post);
		}
		else {
			var parent = comments.findById(replyToId).filter(c -> c.getPostId().equals(postId))
					.orElseThrow(() -> new BadRequestException("Комментарий, на который вы отвечаете, не найден"));
			reason = policy.replyBlockedReason(post, parent);
		}
		if (reason != null) {
			throw new ConflictException(reason);
		}
		var saved = comments.saveAndFlush(mapper.toComment(postId, userId, text, replyToId));
		return toResponses(post, List.of(saved), userId).getFirst();
	}

	/** Исправить свой комментарий; в ответе появится editedAt. */
	@Transactional
	public BlogCommentResponse update(UUID postId, UUID commentId, UUID userId, String text) {
		var post = posts.visible(postId, userId);
		var comment = editable(post, commentId, userId);
		mapper.edit(comment, text, dbTime.now());
		comments.saveAndFlush(comment);
		return toResponses(post, List.of(comment), userId).getFirst();
	}

	/** Удалить свой мягко: вместо текста «Комментарий удалён», ответы остаются. */
	@Transactional
	public void delete(UUID postId, UUID commentId, UUID userId) {
		var post = posts.visible(postId, userId);
		var comment = editable(post, commentId, userId);
		mapper.delete(comment, dbTime.now());
		comments.saveAndFlush(comment);
	}

	/** Чужое — 403, уже удалённое — 409. */
	private BlogComment editable(BlogPost post, UUID commentId, UUID userId) {
		var comment = comments.findById(commentId).filter(c -> c.getPostId().equals(post.getId()))
				.orElseThrow(() -> new NoSuchElementException(NOT_FOUND));
		var reason = policy.commentEditBlockedReason(comment, userId);
		if (reason != null) {
			throw comment.getAuthorId().equals(userId) ? new ConflictException(reason) : new ForbiddenException(reason);
		}
		return comment;
	}

	/** Авторы, цитаты и организации авторов — по одному запросу на весь список. */
	private List<BlogCommentResponse> toResponses(BlogPost post, List<BlogComment> page, UUID userId) {
		if (page.isEmpty()) {
			return List.of();
		}
		var parentIds = page.stream().map(BlogComment::getParentId).filter(Objects::nonNull).distinct().toList();
		Map<UUID, BlogComment> parents = comments.findAllById(parentIds).stream()
				.collect(Collectors.toMap(BlogComment::getId, Function.identity()));
		var authorIds = new HashSet<UUID>();
		page.forEach(c -> authorIds.add(c.getAuthorId()));
		parents.values().forEach(c -> authorIds.add(c.getAuthorId()));
		var authors = users.findAllById(authorIds).stream().collect(Collectors.toMap(AppUser::getId, Function.identity()));
		Map<UUID, OrganizationShortResponse> orgs = organizations.findByAccountIdIn(authorIds).stream()
				.collect(Collectors.toMap(Organization::getAccountId, organizationMapper::toShort, (a, b) -> a));
		return page.stream().map(comment -> {
			var parent = comment.getParentId() == null ? null : parents.get(comment.getParentId());
			return mapper.toCommentResponse(comment, authors.get(comment.getAuthorId()), orgs.get(comment.getAuthorId()),
					comment.getAuthorId().equals(post.getAuthorId()), comment.getAuthorId().equals(userId),
					policy.commentEditBlockedReason(comment, userId) == null,
					parent == null ? null : mapper.toReply(parent, authors.get(parent.getAuthorId())));
		}).toList();
	}
}
