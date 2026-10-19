package com.hackathon.app.domain.dto;

import java.util.List;
import java.util.function.Function;

import org.springframework.data.domain.Page;

/** Страница списка; page считается с нуля. */
public record PageResponse<T>(List<T> items, int page, int size, long totalElements, int totalPages) {

	public static <E, T> PageResponse<T> of(Page<E> page, Function<E, T> mapper) {
		return new PageResponse<>(page.getContent().stream().map(mapper).toList(), page.getNumber(), page.getSize(),
				page.getTotalElements(), page.getTotalPages());
	}

	/** Страница уже посчитанного в памяти списка (например, ранжированной подборки). */
	public static <T> PageResponse<T> slice(List<T> items, int page, int size, long totalElements) {
		return new PageResponse<>(items, page, size, totalElements, (int) ((totalElements + size - 1) / size));
	}
}
