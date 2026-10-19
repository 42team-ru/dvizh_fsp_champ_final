package com.hackathon.app.domain.mapper;

import java.util.List;
import java.util.UUID;

import com.hackathon.app.domain.dto.EventSummaryResponse;
import com.hackathon.app.domain.dto.OrganizationShortResponse;
import com.hackathon.app.domain.dto.RecommendationExplainResponse;
import com.hackathon.app.domain.dto.RecommendationFeature;
import com.hackathon.app.domain.dto.RecommendationReason;
import com.hackathon.app.domain.dto.RecommendedEventResponse;
import com.hackathon.app.domain.dto.RecommendedOrganizationResponse;
import com.hackathon.app.domain.dto.SportResponse;
import com.hackathon.app.domain.entity.RecommendationDismissal;
import com.hackathon.app.domain.enums.DismissReason;
import com.hackathon.app.domain.enums.RecommendationFeatureCode;
import com.hackathon.app.util.RecommendationMath;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;

/** Ответы подборки и запись «Не интересно». Оценки и расстояния округляются до сотых. */
@Mapper(config = MappingConfig.class, uses = FileMapper.class)
public interface RecommendationMapper {

	@Mapping(target = "event", source = "event")
	@Mapping(target = "score", expression = "java(round(score))")
	@Mapping(target = "distanceKm", expression = "java(round(distanceKm))")
	RecommendedEventResponse toEvent(EventSummaryResponse event, double score, Double distanceKm,
			List<RecommendationReason> reasons, boolean discovery);

	@Mapping(target = "organization", source = "organization")
	@Mapping(target = "logoUrl", source = "logoFileId", qualifiedByName = "fileUrl")
	@Mapping(target = "score", expression = "java(round(score))")
	@Mapping(target = "distanceKm", expression = "java(round(distanceKm))")
	RecommendedOrganizationResponse toOrganization(OrganizationShortResponse organization, String city,
			String description, UUID logoFileId, List<SportResponse> sports, long upcomingEvents, long hostedMeetings,
			Double distanceKm, double score, List<RecommendationReason> reasons);

	@Mapping(target = "score", expression = "java(round(score))")
	@Mapping(target = "baseScore", expression = "java(round(baseScore))")
	@Mapping(target = "levelGate", expression = "java(round(levelGate))")
	@Mapping(target = "dismissPenalty", expression = "java(round(dismissPenalty))")
	@Mapping(target = "distanceKm", expression = "java(round(distanceKm))")
	RecommendationExplainResponse toExplain(UUID eventId, double score, double baseScore, double levelGate,
			double dismissPenalty, boolean eligible, String excludedReason, Double distanceKm,
			List<RecommendationFeature> features, List<RecommendationReason> reasons);

	@Mapping(target = "value", expression = "java(round(value))")
	@Mapping(target = "weight", expression = "java(round(weight))")
	@Mapping(target = "contribution", expression = "java(round(contribution))")
	RecommendationFeature toFeature(RecommendationFeatureCode code, double value, double weight, double contribution);

	RecommendationDismissal toDismissal(UUID userId, UUID eventId, UUID sportId, DismissReason reason);

	void updateReason(@MappingTarget RecommendationDismissal dismissal, DismissReason reason);

	@Named("round")
	default double round(double value) {
		return RecommendationMath.round2(value);
	}

	@Named("roundNullable")
	default Double round(Double value) {
		return value == null ? null : RecommendationMath.round2(value);
	}
}
