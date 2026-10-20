package com.hackathon.app.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.enums.SportStatus;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.repository.SportSearchRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SportService {

    private static final int SIMILAR_LIMIT = 5;

    private final SportRepository sports;
    private final SportSearchRepository similar;
    private final SportMapper mapper;

    /**
     * Пустой запрос — весь справочник, иначе поиск по подстроке без учёта регистра, пробелов и ё/е.
     * После точных совпадений идут похожие с опечаткой («падэл» → «Падел»), чтобы человек не завёл дубль.
     */
    @Transactional(readOnly = true)
    public List<SportResponse> search(String query) {
        var normalized = normalize(query);
        if (normalized == null) {
            return sports.findAllByOrderByNameAsc().stream().filter(SportService::selectable).map(mapper::toResponse).toList();
        }
        var exact = sports.findByNormalizedNameContainingOrderByNameAsc(normalized).stream().filter(SportService::selectable).toList();
        var similarIds = similar.findSimilarIds(normalized, SIMILAR_LIMIT);
        var byId = sports.findAllById(similarIds).stream().collect(Collectors.toMap(Sport::getId, Function.identity()));
        var similarSports = similarIds.stream().map(byId::get)
                .filter(sport -> sport != null && selectable(sport) && !exact.contains(sport))
                .toList();
        return Stream.concat(exact.stream(), similarSports.stream()).map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public Sport get(UUID sportId) {
        return sports.findById(sportId).orElseThrow();
    }

    /**
     * Вид спорта для формы мероприятия: из справочника по id или свой по названию.
     * Свой ищется по нормализованному имени, поэтому «Падел», « падел » и «ПАДЕЛ» — один вид; если нет — создаётся custom.
     * Вызывается внутри транзакции создания мероприятия.
     */
    @Transactional
    public Sport resolve(UUID sportId, String sportName, UUID userId) {
        var name = collapseSpaces(sportName);
        if ((sportId == null) == (name == null)) {
            throw new BadRequestException("Выберите вид спорта из списка или введите свой");
        }
        if (sportId != null) {
            return usable(sports.findById(sportId).orElseThrow(() -> new BadRequestException("Неизвестный вид спорта")));
        }
        var normalized = normalize(name);
        return sports.findByNormalizedName(normalized)
                .map(this::usable)
                .orElseGet(() -> sports.save(mapper.toCustom(name, normalized, freeSlug(normalized.replace(' ', '-')), userId)));
    }

    /** Виды, которые показываются в справочнике: отключённые и слитые — нет. */
    private static boolean selectable(Sport sport) {
        return sport.getCatalogStatus() == SportStatus.ACTIVE || sport.getCatalogStatus() == SportStatus.PENDING;
    }

    /** Отключённый вид выбрать нельзя; слитый заменяется видом, с которым его объединили. */
    private Sport usable(Sport sport) {
        return switch (sport.getCatalogStatus()) {
            case ACTIVE, PENDING -> sport;
            case MERGED -> usable(sports.findById(sport.getMergedIntoId()).orElseThrow());
            case HIDDEN -> throw new BadRequestException("Вид спорта «" + sport.getName() + "» отключён администратором");
        };
    }

    /** Свободный slug: при совпадении добавляется номер — «мини-футбол-2». */
    String freeSlug(String name) {
        // колонка slug — 100 символов: оставляем место под номер
        var base = name.length() > 95 ? name.substring(0, 95) : name;
        var slug = base;
        for (int n = 2; sports.existsBySlug(slug); n++) {
            slug = base + "-" + n;
        }
        return slug;
    }

    /** «  Пляжный   волейбол » → «Пляжный волейбол»; пустая → null. */
    static String collapseSpaces(String value) {
        var trimmed = Strings.blankToNull(value);
        return trimmed == null ? null : trimmed.replaceAll("\\s+", " ");
    }

    /** Ключ без дублей: схлопнуть пробелы, нижний регистр, ё → е. */
    static String normalize(String value) {
        var collapsed = collapseSpaces(value);
        return collapsed == null ? null : collapsed.toLowerCase(Locale.ROOT).replace('ё', 'е');
    }
}
