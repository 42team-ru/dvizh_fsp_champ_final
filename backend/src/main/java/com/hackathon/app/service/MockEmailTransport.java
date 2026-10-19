package com.hackathon.app.service;
import com.hackathon.app.domain.enums.*;
import org.springframework.stereotype.Service;
/** Заглушка почты; сетевых вызовов и проверки адреса нет. */
@Service
public class MockEmailTransport implements NotificationTransport {
    public NotificationChannel channel() { return NotificationChannel.EMAIL; }
    public Result send(Long chatId, String text) { return new Result(NotificationDeliveryStatus.MOCKED, null); }
}
