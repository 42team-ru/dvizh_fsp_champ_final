# Hackathon template

Java 25 + Spring Boot 4.1 (Gradle Kotlin DSL) · React Router 7 + Vite + Tailwind (yarn) · Postgres 18 alpine · Caddy · Docker.

## Для жюри / демо: одна команда
```bash
docker compose up --build      # нужен только Docker
```
Откроется на http://localhost:8080 (Swagger: `/swagger-ui.html`). Первая сборка 2–3 минуты. Включён демо-режим: аккаунты `admin`, `anna`, `petr`, `olga` (пароль `demo-password-1`), на странице входа есть кнопки быстрого входа.

## Разработка
```bash
make dev     # Postgres (порт 5440), один раз
make back    # бэкенд  :8080, в своём терминале
make front   # фронт   :5173, в своём терминале
```
Без make: `node scripts/dev.mjs [back|front]` (работает и на Windows).

## Документация
- [docs/dev-faq.md](docs/dev-faq.md): FAQ по деплою (сменить сервер, задеплоить руками, откат, домен, перенос БД, ошибки)
- [docs/deploy.md](docs/deploy.md): как устроен автодеплой
- [docs/development.md](docs/development.md): локальная разработка, тесты, git-хуки
- [docs/architecture.md](docs/architecture.md): структура проекта и контракт API
- [docs/orval.md](docs/orval.md): генерация API-клиента для фронта

Весь список: [docs/README.md](docs/README.md).
