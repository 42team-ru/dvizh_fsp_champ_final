package com.hackathon.app.service;

import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.hackathon.app.dto.AdminOrganizationResponse;
import com.hackathon.app.dto.PageResponse;
import com.hackathon.app.entity.AppUser;
import com.hackathon.app.entity.Organization;
import com.hackathon.app.mapper.OrganizationMapper;
import com.hackathon.app.repository.AppUserRepository;
import com.hackathon.app.repository.DbTimeRepository;
import com.hackathon.app.repository.OrganizationRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Допуск организаций. Роль ADMIN проверяет SecurityConfig (/api/admin/**).
 * Решение можно пересмотреть в любую сторону: одобрить отклонённую или отклонить одобренную.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminOrganizationService {

	private static final int MAX_PAGE_SIZE = 100;

	private final OrganizationRepository organizations;
	private final AppUserRepository users;
	private final DbTimeRepository dbTime;
	private final OrganizationMapper mapper;

	/** Новые заявки сверху. q ищет по названию без учёта регистра. */
	@Transactional(readOnly = true)
	public PageResponse<AdminOrganizationResponse> list(Organization.Status status, String q, int page, int size) {
		var query = Strings.blankToNull(q);
		var pattern = query == null ? "%" : "%" + query.toLowerCase() + "%";
		var pageable = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE),
				Sort.by(Sort.Direction.DESC, "submittedAt"));
		var result = organizations.search(status, pattern, pageable);
		var accounts = users.findAllById(result.getContent().stream().map(Organization::getAccountId).toList())
				.stream()
				.collect(Collectors.toMap(AppUser::getId, Function.identity()));
		return PageResponse.of(result, o -> mapper.toAdmin(o, accounts.get(o.getAccountId())));
	}

	@Transactional(readOnly = true)
	public AdminOrganizationResponse get(UUID id) {
		return toAdmin(find(id));
	}

	@Transactional
	public AdminOrganizationResponse approve(UUID id, UUID adminId) {
		var org = find(id);
		if (org.getStatus() == Organization.Status.APPROVED) {
			return toAdmin(org); // повторное нажатие
		}
		org.setStatus(Organization.Status.APPROVED);
		org.setRejectReason(null);
		return decide(org, adminId);
	}

	/** Повторный отказ просто обновляет причину. */
	@Transactional
	public AdminOrganizationResponse reject(UUID id, UUID adminId, String reason) {
		var org = find(id);
		org.setStatus(Organization.Status.REJECTED);
		org.setRejectReason(reason.trim());
		return decide(org, adminId);
	}

	private AdminOrganizationResponse decide(Organization org, UUID adminId) {
		org.setReviewedAt(dbTime.now());
		org.setReviewedById(adminId);
		organizations.saveAndFlush(org);
		log.info("Решение по организации: organizationId={}, adminId={}, status={}", org.getId(), adminId,
				org.getStatus());
		return toAdmin(org);
	}

	private Organization find(UUID id) {
		return organizations.findById(id).orElseThrow(() -> new NoSuchElementException(OrganizationService.NOT_FOUND));
	}

	private AdminOrganizationResponse toAdmin(Organization org) {
		return mapper.toAdmin(org, users.findById(org.getAccountId()).orElse(null));
	}
}
