package com.hackathon.app.service;
import com.hackathon.app.domain.enums.*;
import org.springframework.stereotype.Service;
/** Заглушка MAX явно отмечает имитированную доставку. */
@Service
public class MockMaxTransport implements NotificationTransport {
    public NotificationChannel channel() { return NotificationChannel.MAX; }
    public Result send(Long chatId, String text) { return new Result(NotificationDeliveryStatus.MOCKED, null); }
}
