package com.hackathon.app.dto;

import jakarta.validation.constraints.Size;

/** reason — причина отказа, участник увидит её в своей записи. */
public record RejectRegistrationRequest(@Size(max = 1000) String reason) {
}
