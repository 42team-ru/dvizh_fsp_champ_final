package com.hackathon.app.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assertions.assertAll;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

import com.hackathon.app.domain.dto.ScheduleRequest;
import com.hackathon.app.domain.dto.ScheduleRuleRequest;
import com.hackathon.app.domain.exception.BadRequestException;
import org.junit.jupiter.api.Test;

/** Расчёт календаря без Spring и базы: независимые правила, смена смещения, дубли и предел размера. */
class ScheduleExpanderTest {
    /**
     * ФЛОУ: календарь сохраняет местное время и отсчитывает интервалы каждого правила от его первого занятия.
     * ШАГИ:
     *   1. Развернуть вторники и воскресенья раз в две недели с DTSTART во второй неделе серии.
     *   2. Развернуть воскресенья Берлина в 20:00 до и после последнего воскресенья марта 2027 года.
     *   3. Развернуть два совпадающих правила; затем два ежедневных правила, дающих больше 500 разных занятий.
     * ПРОВЕРЯЕМ: точные даты воскресений, UTC и местное время вокруг DST, одно занятие вместо дублей,
     *   BadRequestException при превышении 500, а не молчаливое обрезание результата.
     * ПОЧЕМУ ВАЖНО: неверная точка отсчёта или смена смещения сдвинет все тренировки;
     *   дубли и слишком большой календарь нарушат учёт мест и ограничение размера серии.
     */
    @Test
    void expansionRespectsRuleAnchorsDstDeduplicationAndSizeLimit() {
        var expander = new ScheduleExpander();
        assertAll(
                () -> {
                    var zone = ZoneId.of("Asia/Krasnoyarsk");
                    var schedule = new ScheduleRequest(zone.getId(), LocalDate.of(2027, 6, 1), LocalDate.of(2027, 6, 30),
                            List.of(rule("2027-06-01T20:00", "FREQ=WEEKLY;BYDAY=TU"),
                                    rule("2027-06-13T14:00", "FREQ=WEEKLY;INTERVAL=2;BYDAY=SU")));
                    var slots = expander.expand(schedule).slots();
                    assertThat(slots).hasSize(7);
                    assertThat(slots.stream().map(s -> s.start().atZone(zone).toLocalDateTime())
                            .filter(t -> t.toLocalTime().equals(LocalTime.of(14, 0))).toList())
                            .containsExactly(LocalDateTime.parse("2027-06-13T14:00"), LocalDateTime.parse("2027-06-27T14:00"));
                },
                () -> {
                    var zone = ZoneId.of("Europe/Berlin");
                    var schedule = new ScheduleRequest(zone.getId(), LocalDate.of(2027, 3, 21), LocalDate.of(2027, 4, 4),
                            List.of(rule("2027-03-21T20:00", "FREQ=WEEKLY;BYDAY=SU")));
                    var slots = expander.expand(schedule).slots();
                    assertThat(slots).extracting(ScheduleExpander.Slot::start).containsExactly(
                            Instant.parse("2027-03-21T19:00:00Z"), Instant.parse("2027-03-28T18:00:00Z"),
                            Instant.parse("2027-04-04T18:00:00Z"));
                    assertThat(slots).allSatisfy(s -> {
                        assertThat(s.start().atZone(zone).toLocalTime()).isEqualTo(LocalTime.of(20, 0));
                        assertThat(Duration.between(s.start(), s.end())).isEqualTo(Duration.ofMinutes(90));
                    });
                },
                () -> {
                    var schedule = new ScheduleRequest("UTC", LocalDate.of(2027, 6, 1), LocalDate.of(2027, 6, 15),
                            List.of(rule("2027-06-01T20:00", "FREQ=WEEKLY;BYDAY=TU"),
                                    rule("2027-06-01T20:00", "FREQ=WEEKLY;BYDAY=TU")));
                    assertThat(expander.expand(schedule).slots()).extracting(ScheduleExpander.Slot::start).containsExactly(
                            Instant.parse("2027-06-01T20:00:00Z"), Instant.parse("2027-06-08T20:00:00Z"),
                            Instant.parse("2027-06-15T20:00:00Z"));
                },
                () -> {
                    var schedule = new ScheduleRequest("UTC", LocalDate.of(2027, 1, 1), LocalDate.of(2027, 9, 8),
                            List.of(rule("2027-01-01T10:00", "FREQ=DAILY"), rule("2027-01-01T20:00", "FREQ=DAILY")));
                    assertThatThrownBy(() -> expander.expand(schedule)).isInstanceOf(BadRequestException.class)
                            .hasMessageContaining("500");
                });
    }

    private ScheduleRuleRequest rule(String firstStart, String rrule) {
        return new ScheduleRuleRequest(LocalDateTime.parse(firstStart), 90, rrule);
    }
}
