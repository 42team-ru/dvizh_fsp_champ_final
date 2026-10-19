package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.time.Instant;
import java.util.UUID;

import com.hackathon.app.domain.enums.EventFormat;
import com.hackathon.app.domain.enums.EventKind;
import com.hackathon.app.domain.enums.EventLevel;
import com.hackathon.app.domain.enums.JoinMode;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Форма создания и редактирования мероприятия (PUT заменяет все поля).
 * Вид спорта: либо sportId из справочника, либо sportName — свой (создастся, если такого ещё нет).
 * Очному нужны address и точка на карте (lat и lon). level по умолчанию ANY, joinMode — FREE, capacity пусто — без лимита.
 * Разовое — startAt (и endAt); повторяющееся — schedule, а startAt и endAt не передаются.
 * Разовое нельзя превратить в повторяющееся и обратно.
 */
@Schema(description = "Форма мероприятия: создание и полная замена при редактировании")
public record EventRequest(
		@Schema(description = "Название", example = "Футбол в парке Горького", requiredMode = REQUIRED)
		@NotBlank @Size(max = 200) String title,
		@Schema(description = "Описание", example = "Играем 5 на 5, мяч есть")
		@Size(max = 5000) String description,
		@Schema(description = "Вид спорта из справочника; не указывать вместе с sportName")
		UUID sportId,
		@Schema(description = "Свой вид спорта, если в справочнике нет; не указывать вместе с sportId", example = "Петанк")
		@Size(max = 100) String sportName,
		@Schema(description = "Начало разового мероприятия, в будущем; у повторяющегося не передаётся",
				example = "2027-05-01T16:00:00Z")
		Instant startAt,
		@Schema(description = "Окончание разового мероприятия, позже начала; у повторяющегося не передаётся",
				example = "2027-05-01T18:00:00Z")
		Instant endAt,
		@Schema(description = "Очно или онлайн", requiredMode = REQUIRED)
		@NotNull EventFormat format,
		@Schema(description = "Адрес; обязателен для очного", example = "Красноярск, о. Татышев")
		@Size(max = 500) String address,
		@Schema(description = "Как найти место", example = "У главного входа")
		@Size(max = 1000) String locationNote,
		@Schema(description = "Ссылка на онлайн-встречу; видят только подтверждённые участники", example = "https://meet.example/abc")
		@Size(max = 1000) String onlineUrl,
		@Schema(description = "Широта точки на карте; обязательна для очного, у онлайн не сохраняется", example = "56.0153")
		@DecimalMin("-90") @DecimalMax("90") Double lat,
		@Schema(description = "Долгота точки на карте; обязательна для очного, у онлайн не сохраняется", example = "92.8932")
		@DecimalMin("-180") @DecimalMax("180") Double lon,
		@Schema(description = "Для какого уровня; по умолчанию ANY")
		EventLevel level,
		@Schema(description = "Вид мероприятия")
		EventKind kind,
		@Schema(description = "Требования к участникам", example = "Без опыта можно")
		@Size(max = 2000) String requirements,
		@Schema(description = "Что взять с собой", example = "Форма, вода")
		@Size(max = 2000) String equipment,
		@Schema(description = "Лимит мест; пусто — без лимита. У повторяющегося — на каждое занятие", example = "10",
				minimum = "1", maximum = "10000")
		@Min(1) @Max(10000) Integer capacity,
		@Schema(description = "Режим записи; по умолчанию FREE")
		JoinMode joinMode,
		@Schema(description = "Детали только для участников: точное место, ссылка на чат", example = "Чат: https://t.me/example")
		@Size(max = 2000) String privateDetails,
		@Schema(description = "Расписание повторяющегося мероприятия; null — разовое")
		@Valid ScheduleRequest schedule,
		@Schema(description = "Кворум: состоится, если наберём столько; пусто — без кворума. Не больше лимита мест. "
				+ "У повторяющегося — на каждое занятие", example = "6", minimum = "1", maximum = "10000")
		@Min(1) @Max(10000) Integer minParticipants) {
}
