package com.hackathon.app.domain.mapper;

import com.hackathon.app.util.Strings;
import org.mapstruct.MapperConfig;
import org.mapstruct.MappingConstants;
import org.mapstruct.ReportingPolicy;

/**
 * Общие настройки всех мапперов (подключать через {@code @Mapper(config = MappingConfig.class)}):
 * Spring-бин; поля цели без источника (id, даты аудита) молча пропускаются, без {@code ignore = true};
 * каждая строка проходит через {@link Strings#blankToNull}: пробелы обрезаются, пустая строка становится null.
 */
@MapperConfig(componentModel = MappingConstants.ComponentModel.SPRING,
		unmappedTargetPolicy = ReportingPolicy.IGNORE,
		uses = Strings.class)
public interface MappingConfig {
}
