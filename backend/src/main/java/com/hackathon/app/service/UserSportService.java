package com.hackathon.app.service;

import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hackathon.app.domain.dto.SaveUserSportsRequest;
import com.hackathon.app.domain.dto.UserSportResponse;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.entity.UserSport;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.SportLevel;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.domain.mapper.UserSportMapper;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.repository.UserSportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Виды спорта в профиле пользователя и уровень в каждом. Из них строится лента «Для меня». */
@Service
@RequiredArgsConstructor
public class UserSportService {

	private final UserSportRepository userSports;
	private final SportRepository sports;
	private final SportService sportService;
	private final SportMapper sportMapper;
	private final UserSportMapper mapper;

	/** Виды спорта пользователя по алфавиту. */
	@Transactional(readOnly = true)
	public List<UserSportResponse> of(UUID userId) {
		var mine = userSports.findByUserId(userId);
		var sportById = new HashMap<UUID, Sport>();
		sports.findAllById(mine.stream().map(UserSport::getSportId).toList())
				.forEach(sport -> sportById.put(sport.getId(), sport));
		return mine.stream()
				.filter(us -> sportById.containsKey(us.getSportId()))
				.map(us -> mapper.toResponse(sportMapper.toResponse(sportById.get(us.getSportId())), us.getLevel()))
				.sorted(Comparator.comparing(r -> r.sport().name()))
				.toList();
	}

	/**
	 * Список заменяется целиком. Свой вид по названию ищется или создаётся так же, как в форме мероприятия.
	 * Один вид дважды — остаётся последний (с его уровнем).
	 */
	@Transactional
	public List<UserSportResponse> save(UUID userId, SaveUserSportsRequest request) {
		var levelBySport = new LinkedHashMap<UUID, SportLevel>();
		for (var item : request.sports()) {
			var sport = sportService.resolve(item.sportId(), item.sportName(), userId);
			levelBySport.remove(sport.getId());
			levelBySport.put(sport.getId(), item.level());
		}
		userSports.deleteAllInBatch(userSports.findByUserId(userId));
		userSports.flush();
		userSports.saveAll(levelBySport.entrySet().stream()
				.map(entry -> mapper.toEntity(userId, entry.getKey(), entry.getValue()))
				.toList());
		userSports.flush();
		return of(userId);
	}

	/**
	 * Для ленты «Для меня»: вид спорта → уровень мероприятия, который подходит; null — подходит любой уровень.
	 * Пустая карта — видов в профиле нет, подходящих мероприятий тоже.
	 */
	@Transactional(readOnly = true)
	public Map<UUID, EventLevel> preferences(UUID userId) {
		var result = new HashMap<UUID, EventLevel>();
		for (var us : userSports.findByUserId(userId)) {
			result.put(us.getSportId(), us.getLevel() == null ? null : us.getLevel().toEventLevel());
		}
		return result;
	}
}
