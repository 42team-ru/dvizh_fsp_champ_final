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
COPY --from=build /extracted/dependencies/ ./
COPY --from=build /extracted/spring-boot-loader/ ./
COPY --from=build /extracted/snapshot-dependencies/ ./
COPY --from=build /extracted/application/ ./
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "application.jar"]
