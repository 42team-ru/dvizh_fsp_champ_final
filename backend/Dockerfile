# syntax=docker/dockerfile:1
# Полная сборка из исходников (для жюри/локального запуска). В CI используется Dockerfile.ci.
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /src
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle gradle
# Зависимости отдельным слоем: инвалидируется только при правке build.gradle.kts
RUN --mount=type=cache,target=/root/.gradle ./gradlew dependencies -q --no-daemon >/dev/null 2>&1 || true
COPY src src
RUN --mount=type=cache,target=/root/.gradle ./gradlew bootJar -x test --no-daemon --console=plain
RUN cp build/libs/app.jar /tmp/application.jar && java -Djarmode=tools -jar /tmp/application.jar extract --layers --destination /extracted

FROM eclipse-temurin:25-jre-alpine
WORKDIR /srv
# Python для импорта вещей бобра (PetArtImporter): PNG/SVG → SVG из контуров. Версии как в pet-import/requirements.txt.
# Именно 3.13: vtracer 0.6.15 падает с segfault на Python 3.14, а в alpine уже 3.14 — поэтому ставим через uv.
ENV UV_PYTHON_INSTALL_DIR=/opt/python
RUN apk add --no-cache uv \
    && uv venv --python 3.13 /opt/pet-import \
    && uv pip install --python /opt/pet-import/bin/python --no-cache vtracer==0.6.15 pillow==13.0.0 svgelements==1.9.6 \
    && apk del uv
ENV PET_IMPORT_PYTHON=/opt/pet-import/bin/python
COPY --from=build /extracted/dependencies/ ./
COPY --from=build /extracted/spring-boot-loader/ ./
COPY --from=build /extracted/snapshot-dependencies/ ./
COPY --from=build /extracted/application/ ./
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "application.jar"]
