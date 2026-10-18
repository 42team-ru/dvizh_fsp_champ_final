package com.hackathon.app.dto;

import java.time.Instant;

public record PingResponse(String status, Instant time) {
}
