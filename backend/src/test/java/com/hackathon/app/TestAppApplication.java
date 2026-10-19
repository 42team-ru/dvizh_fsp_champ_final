package com.hackathon.app;

import org.springframework.boot.SpringApplication;

public class TestAppApplication {

	static void main(String[] args) {
		SpringApplication.from(AppApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
