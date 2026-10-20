package com.hackathon.app.domain.mapper;

import java.util.UUID;
import com.hackathon.app.domain.entity.OrganizationSubscription;
import org.mapstruct.Mapper;

@Mapper(config = MappingConfig.class)
public interface OrganizationSubscriptionMapper {
    OrganizationSubscription toEntity(UUID organizationId, UUID userId);
}
