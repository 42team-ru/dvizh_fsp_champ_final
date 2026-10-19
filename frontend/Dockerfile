# syntax=docker/dockerfile:1
# Контекст сборки — корень репозитория (нужен deploy/Caddyfile)
FROM node:24-alpine AS build
WORKDIR /src
COPY frontend/package.json frontend/yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn yarn install --frozen-lockfile
COPY frontend/ ./
# Пустой URL = тот же origin (Caddy проксирует /api); иначе клиент ходил бы на localhost:8080
ENV VITE_BACKEND_URL=""
# Ключ карты 2ГИС попадает в сборку из корневого .env через args в docker-compose.yml
ARG VITE_2GIS_KEY=""
ARG VITE_2GIS_STYLE_ID=""
ENV VITE_2GIS_KEY=$VITE_2GIS_KEY VITE_2GIS_STYLE_ID=$VITE_2GIS_STYLE_ID
RUN yarn build

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/build/client /srv/web
