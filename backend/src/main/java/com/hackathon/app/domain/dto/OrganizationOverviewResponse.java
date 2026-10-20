package com.hackathon.app.domain.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Статистика и первые страницы разделов публичного клуба. Считаем занятия, включая занятия серий. */
public record OrganizationOverviewResponse(
        Integer firstEventYear,
        @Schema(requiredMode = REQUIRED) long hostedMeetings,
        @Schema(requiredMode = REQUIRED) long yearParticipants,
        @Schema(requiredMode = REQUIRED) long photosCount,
        @Schema(requiredMode = REQUIRED) long photoMeetingsCount,
        Integer returningShare,
        @Schema(requiredMode = REQUIRED) String petName,
        @Schema(requiredMode = REQUIRED) OrganizationSubscriptionResponse subscription,
        @Schema(requiredMode = REQUIRED) List<MonthCount> months,
        @Schema(requiredMode = REQUIRED) List<ScheduleDay> schedule,
        @Schema(requiredMode = REQUIRED) List<Leader> leaders,
        @Schema(requiredMode = REQUIRED) List<Place> places,
        @Schema(requiredMode = REQUIRED) List<SportCount> pastSports,
        @Schema(requiredMode = REQUIRED) PageResponse<OrganizationMeetingResponse> upcoming,
        @Schema(requiredMode = REQUIRED) PageResponse<OrganizationMeetingResponse> past,
        @Schema(requiredMode = REQUIRED) PageResponse<FileResponse> photos) {
    /** Месяц графика и подтверждённая награда за него. */
    public record MonthCount(
            @Schema(requiredMode = REQUIRED) LocalDate month,
            @Schema(requiredMode = REQUIRED) long count,
            @Schema(requiredMode = REQUIRED) boolean awardMonth,
            @Schema(requiredMode = REQUIRED) boolean current) {}
    /** Ближайшее занятие каждого дня недели в следующие четыре недели. */
    public record ScheduleDay(
            @Schema(requiredMode = REQUIRED) DayOfWeek day,
            @Schema(requiredMode = REQUIRED) UUID eventId,
            @Schema(requiredMode = REQUIRED) Instant startAt,
            @Schema(requiredMode = REQUIRED) String timeZone,
            @Schema(requiredMode = REQUIRED) String title,
            @Schema(requiredMode = REQUIRED) String place) {}
    /** Человек в команде; число занятий, которые он ведёт. */
    public record Leader(
            @Schema(requiredMode = REQUIRED) UserShortResponse user,
            @Schema(requiredMode = REQUIRED) long meetingsCount) {}
    /** Площадка и число занятий на ней. */
    public record Place(
            @Schema(requiredMode = REQUIRED) String name,
            @Schema(requiredMode = REQUIRED) long meetingsCount) {}
    /** Число проведённых занятий по виду спорта. */
    public record SportCount(
            @Schema(requiredMode = REQUIRED) SportResponse sport,
            @Schema(requiredMode = REQUIRED) long count) {}
}
