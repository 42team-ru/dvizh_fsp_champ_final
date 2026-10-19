package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.LocalDate;
import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Расписание повторяющегося мероприятия. Границы серии обязательны (не длиннее года, не больше 500 занятий),
 * правил от 1 до 10; совпавшие по времени занятия разных правил схлопываются в одно.
 */
@Schema(description = "Расписание серии: часовой пояс, границы по датам и правила повторения")
public record ScheduleRequest(
		@Schema(description = "Часовой пояс (IANA), в нём считаются даты и время правил", example = "Asia/Krasnoyarsk",
				requiredMode = REQUIRED)
		@NotBlank @Size(max = 64) String timeZone,
		@Schema(description = "Первый день серии, включительно", example = "2027-06-01", requiredMode = REQUIRED)
		@NotNull LocalDate startDate,
		@Schema(description = "Последний день серии, включительно; не позже чем через год после первого",
				example = "2027-08-31", requiredMode = REQUIRED)
		@NotNull LocalDate endDate,
		@Schema(description = "Правила повторения, от 1 до 10", requiredMode = REQUIRED)
		@NotEmpty @Size(max = 10) List<@Valid @NotNull ScheduleRuleRequest> rules) {
}
