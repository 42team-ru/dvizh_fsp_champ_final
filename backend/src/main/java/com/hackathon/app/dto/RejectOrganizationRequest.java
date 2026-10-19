package com.hackathon.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Причина отказа обязательна: организация увидит её в кабинете и сможет исправить анкету. */
public record RejectOrganizationRequest(@NotBlank @Size(max = 1000) String reason) {
}
