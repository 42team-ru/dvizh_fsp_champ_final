package com.hackathon.app.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.Sport;
import com.hackathon.app.domain.exception.BadRequestException;
import com.hackathon.app.domain.mapper.SportMapper;
import com.hackathon.app.repository.SportRepository;
import com.hackathon.app.util.Strings;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SportService {

    private final SportRepository sports;
    private final SportMapper mapper;

    /** Пустой запрос — весь справочник, иначе поиск по подстроке без учёта регистра, пробелов и ё/е. */
    @Transactional(readOnly = true)
    public List<SportResponse> search(String query) {
        var normalized = normalize(query);
        var found = normalized == null
                ? sports.findAllByOrderByNameAsc()
                : sports.findByNormalizedNameContainingOrderByNameAsc(normalized);
        return found.stream().map(mapper::toResponse).toList();
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
            return sports.findById(sportId).orElseThrow(() -> new BadRequestException("Неизвестный вид спорта"));
        }
        var normalized = normalize(name);
        return sports.findByNormalizedName(normalized)
                .orElseGet(() -> sports.save(mapper.toCustom(name, normalized, normalized.replace(' ', '-'), userId)));
    }

    /** «  Пляжный   волейбол » → «Пляжный волейбол»; пустая → null. */
    private static String collapseSpaces(String value) {
        var trimmed = Strings.blankToNull(value);
        return trimmed == null ? null : trimmed.replaceAll("\\s+", " ");
    }

    /** Ключ без дублей: схлопнуть пробелы, нижний регистр, ё → е. */
    private static String normalize(String value) {
        var collapsed = collapseSpaces(value);
        return collapsed == null ? null : collapsed.toLowerCase(Locale.ROOT).replace('ё', 'е');
    }
}
