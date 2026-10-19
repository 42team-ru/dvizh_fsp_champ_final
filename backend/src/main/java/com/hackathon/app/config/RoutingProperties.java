package com.hackathon.app.config;

import java.net.URI;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/** Маршруты 2ГИС для подсказки «когда выходить»; без ключа работает оценка по расстоянию. */
@ConfigurationProperties("app.routing")
public record RoutingProperties(@DefaultValue("") String dgisKey,
        @DefaultValue("https://routing.api.2gis.com") URI apiUrl,
        @DefaultValue("15") int cacheMinutes) {
    public boolean enabled() { return !dgisKey.isBlank(); }
    @Override public String toString() { return "RoutingProperties[enabled=" + enabled() + "]"; }
}
