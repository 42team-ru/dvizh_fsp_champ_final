package com.hackathon.app.domain.dto;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
/** Прочитать только уведомления из показанного снимка. */
public record ReadNotificationsRequest(@NotNull @Min(0) Long throughRevision) {}
