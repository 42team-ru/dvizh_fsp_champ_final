package com.hackathon.app.domain.dto;

import java.time.Instant;

public record PingResponse(String status, Instant time) {
}
