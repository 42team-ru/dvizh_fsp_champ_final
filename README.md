# Hackathon template

Java 25 + Spring Boot 4.1 (Gradle Kotlin DSL) · React Router 7 + Vite + Tailwind (yarn) · Postgres 18 alpine · Caddy · Docker.

## Для жюри / демо: одна команда
```bash
docker compose up --build      # нужен только Docker
```
Откроется на http://localhost:8080 (Swagger: `/swagger-ui.html`). Первая сборка 2–3 минуты. Включён демо-режим, пароль у всех `demo-password-1`. На странице входа — кнопки на четыре роли: `anna` (пользователь), `ladya` (одобренная организация), `enisey` (организация ждёт одобрения), `admin`. Для проверки «под другим пользователем» есть ещё `petr` (организатор с заявками) и `olga`, без кнопок — логин вводится в форму.

## Разработка
```bash
make dev     # Postgres (порт 5440) и S3/MinIO (порт 9440, консоль 9441), один раз
make back    # бэкенд  :8080, в своём терминале
make front   # фронт   :5173, в своём терминале
```
Без make: `node scripts/dev.mjs [back|front]` (работает и на Windows).

## Личная галерея

В профиле можно загрузить до 6 фотографий JPG, PNG или WebP по 5 МБ, открыть снимок и удалить его.
Галерея хранится отдельно от аватара; фотографии доступны вошедшим пользователям через публичный профиль API.

## Документация
- [docs/dev-faq.md](docs/dev-faq.md): FAQ по деплою (сменить сервер, задеплоить руками, откат, домен, перенос БД, ошибки)
- [docs/deploy.md](docs/deploy.md): как устроен автодеплой
- [docs/development.md](docs/development.md): локальная разработка, тесты, git-хуки
- [docs/architecture.md](docs/architecture.md): структура проекта и контракт API
- [docs/orval.md](docs/orval.md): генерация API-клиента для фронта

Весь список: [docs/README.md](docs/README.md).
