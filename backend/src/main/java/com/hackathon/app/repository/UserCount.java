package com.hackathon.app.repository;

import java.util.UUID;

/** Счётчик объектов пользователя для одной страницы админки. */
public interface UserCount {
    UUID getUserId();
    long getCount();
}
