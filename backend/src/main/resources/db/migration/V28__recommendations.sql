-- Домашняя точка для рекомендаций «рядом с домом»: обе координаты или ни одной.
ALTER TABLE user_preferences ADD COLUMN home_lat DOUBLE PRECISION;
ALTER TABLE user_preferences ADD COLUMN home_lon DOUBLE PRECISION;
ALTER TABLE user_preferences ADD CONSTRAINT ck_user_preferences_home
    CHECK ((home_lat IS NULL) = (home_lon IS NULL));

-- «Не интересно» в подборке: событие скрывается, а с причиной NOT_MY_SPORT ещё и вид спорта показывается реже.
CREATE TABLE recommendation_dismissals (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    sport_id UUID NOT NULL REFERENCES sports (id),
    reason VARCHAR(30) NOT NULL CHECK (reason IN ('NOT_INTERESTED', 'NOT_MY_SPORT', 'TOO_FAR', 'BAD_TIME')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_recommendation_dismissals_user_event UNIQUE (user_id, event_id)
);
