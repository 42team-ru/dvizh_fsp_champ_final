package com.hackathon.app.domain.mapper;

import java.util.List;

import com.hackathon.app.domain.dto.AttendanceSummaryResponse;
import com.hackathon.app.domain.dto.AttendedOccurrenceResponse;
import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.SportAttendanceResponse;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.EventOccurrence;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(config = MappingConfig.class)
public interface AttendanceMapper {

	@Mapping(target = "occurrenceId", source = "occurrence.id")
	@Mapping(target = "startAt", source = "occurrence.startAt")
	@Mapping(target = "endAt", source = "occurrence.endAt")
	AttendedOccurrenceResponse toAttended(EventOccurrence occurrence, EventSummaryResponse event);

	SportAttendanceResponse toSportAttendance(SportResponse sport, long count);

	AttendanceSummaryResponse toSummary(long total, List<SportAttendanceResponse> bySport);
}
