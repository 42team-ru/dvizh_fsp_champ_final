package com.hackathon.app.config;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
/** Доставка по сети не должна задерживать long polling и напоминания. */
@Configuration
@EnableScheduling
public class NotificationSchedulingConfig {
    @Bean
    ThreadPoolTaskScheduler taskScheduler() {
        var scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4);
        scheduler.setThreadNamePrefix("notifications-");
        // Прерывание отправки безопасно: незавершённый lease подхватится после перезапуска.
        // Долгие cron/fixed-delay задания не должны удерживать закрытие контекста.
        scheduler.setWaitForTasksToCompleteOnShutdown(false);
        scheduler.setExecuteExistingDelayedTasksAfterShutdownPolicy(false);
        scheduler.setContinueExistingPeriodicTasksAfterShutdownPolicy(false);
        scheduler.setAwaitTerminationSeconds(5);
        return scheduler;
    }
}
