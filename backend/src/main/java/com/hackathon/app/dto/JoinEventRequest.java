package com.hackathon.app.dto;

import jakarta.validation.constraints.Size;

/** message — сопроводительное сообщение к заявке (имеет смысл для joinMode = REQUEST). */
public record JoinEventRequest(@Size(max = 1000) String message) {
}
