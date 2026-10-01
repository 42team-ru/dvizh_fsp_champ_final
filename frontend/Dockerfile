# syntax=docker/dockerfile:1
# Контекст сборки — корень репозитория (нужен deploy/Caddyfile)
FROM node:24-alpine AS build
WORKDIR /src
COPY frontend/package.json frontend/yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn yarn install --frozen-lockfile
COPY frontend/ ./
RUN yarn build

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/dist /srv/web
