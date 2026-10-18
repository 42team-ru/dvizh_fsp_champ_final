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
	compileOnly("org.projectlombok:lombok")
	developmentOnly("org.springframework.boot:spring-boot-devtools")
	runtimeOnly("org.postgresql:postgresql")
	annotationProcessor("org.projectlombok:lombok")
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

// Включает git-хуки репозитория при первой сборке (молча пропускает, если нет git, например в Docker)
val installGitHooks by tasks.registering {
	val repoRoot: File = project.rootDir.parentFile
	doLast {
		try {
			ProcessBuilder("git", "config", "core.hooksPath", ".githooks")
				.directory(repoRoot)
				.redirectErrorStream(true)
				.start()
				.waitFor()
		} catch (_: Exception) {
		}
	}
}

tasks.compileJava {
	dependsOn(installGitHooks)
}
