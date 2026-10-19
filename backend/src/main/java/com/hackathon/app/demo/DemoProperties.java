package com.hackathon.app.demo;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Демо-режим (DEMO_MODE=true): при старте создаются тестовые аккаунты, на странице входа появляется быстрый вход. */
@ConfigurationProperties("app.demo")
public record DemoProperties(boolean enabled, String password) {
}
