package com.hackathon.app.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.auth")
public record AuthProperties(String jwtSecret, Duration accessTtl, Duration refreshTtl) {
}
