package com.hackathon.app.domain.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
/** Только поля webhook, необходимые командам и обработке блокировки бота. */
public record TelegramUpdateRequest(@JsonProperty("update_id") Long updateId, Message message,
        @JsonProperty("my_chat_member") ChatMemberUpdate myChatMember) {
    /** Пользователь Telegram. */
    public record User(Long id, String username) {}
    /** Личный чат. */
    public record Chat(Long id, String type) {}
    /** Входящее сообщение. */
    public record Message(User from, Chat chat, String text) {}
    /** Новое членство бота. */
    public record ChatMember(String status) {}
    /** Блокировка бота в личном чате. */
    public record ChatMemberUpdate(Chat chat, @JsonProperty("new_chat_member") ChatMember newChatMember) {}
}
