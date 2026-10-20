plugins {
	java
	id("org.springframework.boot") version "4.1.1"
	id("io.spring.dependency-management") version "1.1.7"
}

group = "com.hackathon"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(25)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.flywaydb:flyway-database-postgresql")
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.1.1")
	implementation("org.mapstruct:mapstruct:1.6.3")
	// Расписание повторяющихся мероприятий: разбор и развёртка RRULE (RFC 5545) с учётом часового пояса
	implementation("org.dmfs:lib-recur:0.17.1")
	// S3-хранилище файлов (MinIO локально и на VPS, подойдёт любой S3). Только синхронный клиент, HTTP — из JDK.
	implementation(platform("software.amazon.awssdk:bom:2.56.0"))
	implementation("software.amazon.awssdk:s3") {
		exclude(group = "software.amazon.awssdk", module = "netty-nio-client")
		exclude(group = "software.amazon.awssdk", module = "apache-client")
	}
	implementation("software.amazon.awssdk:url-connection-client")
	compileOnly("org.projectlombok:lombok")
	developmentOnly("org.springframework.boot:spring-boot-devtools")
	runtimeOnly("org.postgresql:postgresql")
	// Порядок важен: MapStruct должен видеть геттеры/сеттеры, которые генерирует Lombok
	annotationProcessor("org.projectlombok:lombok")
	annotationProcessor("org.projectlombok:lombok-mapstruct-binding:0.2.0")
	annotationProcessor("org.mapstruct:mapstruct-processor:1.6.3")
	annotationProcessor("org.springframework.boot:spring-boot-configuration-processor")
	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testCompileOnly("org.projectlombok:lombok")
	testRuntimeOnly("com.h2database:h2")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
	testAnnotationProcessor("org.projectlombok:lombok")
}

tasks.bootJar {
	archiveFileName = "app.jar"
}

tasks.jar {
	enabled = false
}

tasks.withType<Test> {
	useJUnitPlatform()
}

// `./gradlew test` — быстрые тесты на H2, Docker не нужен.
// `./gradlew postgresTest` — смоук на настоящем Postgres (Testcontainers). `./gradlew check` (CI) — оба.
tasks.test {
	useJUnitPlatform { excludeTags("postgres") }
}

val postgresTest by tasks.registering(Test::class) {
	group = "verification"
	description = "Тесты с тегом postgres (Testcontainers, нужен Docker)"
	testClassesDirs = sourceSets.test.get().output.classesDirs
	classpath = sourceSets.test.get().runtimeClasspath
	useJUnitPlatform { includeTags("postgres") }
	shouldRunAfter(tasks.test)
}

tasks.check {
	dependsOn(postgresTest)
}

